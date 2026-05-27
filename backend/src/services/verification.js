import { embedTextMap, fieldSimilarityFromEmbeddings, similarityToConfidence } from './embeddings.js';
import { getDb } from '../db.js';
import { config } from '../config.js';

const COMPARABLE_FIELDS = [
  { key: 'legalName', label: 'Legal / Enterprise Name', sources: ['user', 'ckyc', 'eprotean', 'udyam'] },
  { key: 'pan', label: 'PAN', sources: ['user', 'ckyc', 'eprotean'], exact: true },
  { key: 'email', label: 'Email', sources: ['user', 'ckyc', 'udyam'] },
  { key: 'mobile', label: 'Mobile', sources: ['user', 'ckyc', 'udyam'] },
  { key: 'address', label: 'Registered Address', sources: ['user', 'ckyc', 'eprotean'] },
  { key: 'udyamNumber', label: 'Udyam Registration No.', sources: ['user', 'udyam'], exact: true },
];

function normalizeValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function exactMatch(a, b) {
  const na = normalizeValue(a);
  const nb = normalizeValue(b);
  if (!na || !nb) return false;
  return na === nb || na.replace(/[^a-z0-9]/g, '') === nb.replace(/[^a-z0-9]/g, '');
}

function extractSourceValues(userInput, externalResponses) {
  const { ckyc, eprotean, udyam } = externalResponses;
  return {
    user: {
      legalName: userInput.legalName,
      pan: userInput.pan,
      email: userInput.email,
      mobile: userInput.mobile,
      address: userInput.address,
      udyamNumber: userInput.udyamNumber,
    },
    ckyc: {
      legalName: ckyc.data.legalName,
      pan: ckyc.data.pan,
      email: ckyc.data.email,
      mobile: ckyc.data.mobile,
      address: ckyc.data.registeredAddress,
    },
    eprotean: {
      legalName: eprotean.data.companyName,
      pan: eprotean.data.pan,
      address: eprotean.data.registeredOffice,
    },
    udyam: {
      legalName: udyam.data.enterpriseName,
      mobile: udyam.data.mobile,
      email: udyam.data.email,
      udyamNumber: udyam.data.udyamRegistrationNumber,
    },
  };
}

function comparePairWithCache(userValue, externalValue, fieldMeta, embeddingCache) {
  const userStr = String(userValue ?? '').trim();
  const extStr = String(externalValue ?? '').trim();

  if (!userStr && !extStr) {
    return { userValue: userStr, externalValue: extStr, similarity: 1, confidence: 100, status: 'skipped' };
  }
  if (!userStr || !extStr) {
    return { userValue: userStr, externalValue: extStr, similarity: 0, confidence: 0, status: 'mismatch' };
  }

  const isExact = fieldMeta.exact && exactMatch(userStr, extStr);
  const userEmbedding = embeddingCache.get(userStr);
  const externalEmbedding = embeddingCache.get(extStr);

  if (isExact) {
    return {
      userValue: userStr,
      externalValue: extStr,
      similarity: 1,
      confidence: 100,
      status: 'match',
      userEmbedding,
      externalEmbedding: userEmbedding,
      embeddingProvider: 'voyage-ai',
    };
  }

  const similarity = fieldSimilarityFromEmbeddings(userEmbedding, externalEmbedding);
  const confidence = similarityToConfidence(similarity, exactMatch(userStr, extStr));
  let status = 'match';
  if (confidence < 60) status = 'mismatch';
  else if (confidence < 85) status = 'review';

  return {
    userValue: userStr,
    externalValue: extStr,
    similarity: Math.round(similarity * 1000) / 1000,
    confidence,
    status,
    userEmbedding,
    externalEmbedding,
    embeddingProvider: 'voyage-ai',
  };
}

export async function runVerification(userInput, externalResponses) {
  const sources = extractSourceValues(userInput, externalResponses);

  const textsToEmbed = new Set();
  for (const field of COMPARABLE_FIELDS) {
    for (const src of field.sources) {
      if (src === 'user') continue;
      const userVal = String(sources.user[field.key] ?? '').trim();
      const extVal = String(sources[src]?.[field.key] ?? '').trim();
      if (userVal) textsToEmbed.add(userVal);
      if (extVal) textsToEmbed.add(extVal);
    }
  }

  const embeddingCache = await embedTextMap([...textsToEmbed], { inputType: 'document' });

  const fieldResults = [];

  for (const field of COMPARABLE_FIELDS) {
    const comparisons = [];
    for (const src of field.sources) {
      if (src === 'user') continue;
      const userVal = sources.user[field.key];
      const extVal = sources[src]?.[field.key];
      if (extVal === undefined) continue;
      const result = comparePairWithCache(userVal, extVal, field, embeddingCache);
      comparisons.push({
        externalSource: src.toUpperCase(),
        ...result,
      });
    }

    const confidences = comparisons.filter((c) => c.status !== 'skipped').map((c) => c.confidence);
    const avgConfidence =
      confidences.length > 0
        ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
        : null;

    fieldResults.push({
      field: field.key,
      label: field.label,
      comparisons,
      aggregateConfidence: avgConfidence,
    });
  }

  const allConfidences = fieldResults
    .map((f) => f.aggregateConfidence)
    .filter((c) => c !== null);
  const overallConfidence =
    allConfidences.length > 0
      ? Math.round(allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length)
      : 0;

  let decision = 'AUTO_APPROVED';
  let decisionReason = 'All fields meet confidence threshold (≥85%).';
  if (overallConfidence < 60) {
    decision = 'REJECTED';
    decisionReason = 'Critical mismatches detected between user input and external sources.';
  } else if (overallConfidence < 85) {
    decision = 'MANUAL_REVIEW';
    decisionReason = 'Some fields require human review — Voyage AI similarity below auto-approve threshold.';
  }

  return {
    fieldResults,
    overallConfidence,
    decision,
    decisionReason,
    embeddingProvider: 'voyage-ai',
    voyageModel: config.voyageModel,
    thresholds: { autoApprove: 85, reject: 60 },
  };
}

/** Store field embeddings and run Atlas Vector Search against knowledge base */
export async function enrichWithVectorSearch(registrationId, verification) {
  const db = getDb();
  const coll = db.collection('field_embeddings');
  const kb = db.collection('verified_entity_knowledge');

  const docs = [];
  for (const field of verification.fieldResults) {
    for (const comp of field.comparisons) {
      if (!comp.userEmbedding) continue;
      docs.push({
        registrationId,
        field: field.field,
        label: field.label,
        externalSource: comp.externalSource,
        userValue: comp.userValue,
        externalValue: comp.externalValue,
        confidence: comp.confidence,
        embedding: comp.userEmbedding,
        embeddingProvider: 'voyage-ai',
        voyageModel: config.voyageModel,
        embeddingType: 'user_input',
        createdAt: new Date(),
      });
      if (comp.externalEmbedding) {
        docs.push({
          registrationId,
          field: field.field,
          label: field.label,
          externalSource: comp.externalSource,
          userValue: comp.userValue,
          externalValue: comp.externalValue,
          confidence: comp.confidence,
          embedding: comp.externalEmbedding,
          embeddingProvider: 'voyage-ai',
          voyageModel: config.voyageModel,
          embeddingType: 'external_api',
          createdAt: new Date(),
        });
      }
    }
  }

  if (docs.length) await coll.insertMany(docs);

  const vectorInsights = [];
  for (const field of verification.fieldResults) {
    const primary = field.comparisons[0];
    if (!primary?.userEmbedding) continue;

    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: config.vectorIndexName,
            path: 'profileEmbedding',
            queryVector: primary.userEmbedding,
            numCandidates: 50,
            limit: 3,
          },
        },
        {
          $project: {
            legalName: 1,
            entityType: 1,
            pan: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];
      const similar = await kb.aggregate(pipeline).toArray();
      vectorInsights.push({
        field: field.field,
        label: field.label,
        similarEntities: similar,
        note: 'MongoDB $vectorSearch (Voyage AI query vectors) against verified entity knowledge base',
      });
    } catch (err) {
      vectorInsights.push({
        field: field.field,
        label: field.label,
        similarEntities: [],
        note: `Vector Search unavailable (${err.message}). Ensure Atlas index dimensions match Voyage model (${config.embeddingDimensions}).`,
      });
    }
  }

  return vectorInsights;
}
