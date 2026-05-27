import { config } from '../config.js';
import { embedTextMap, voyageEmbed } from './voyage.js';

export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function similarityToConfidence(similarity, isExact = false) {
  if (isExact) return 100;
  const clamped = Math.max(0, Math.min(1, similarity));
  return Math.round(clamped * 100);
}

/** Cosine similarity between two field values using Voyage AI embeddings only */
export function fieldSimilarityFromEmbeddings(userEmbedding, externalEmbedding) {
  return cosineSimilarity(userEmbedding, externalEmbedding);
}

/**
 * Embed a single string via Voyage AI (prefer embedTextMap for batches).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return new Array(config.embeddingDimensions).fill(0);
  const [embedding] = await voyageEmbed([trimmed], { inputType: 'document' });
  return embedding;
}

export { embedTextMap, voyageEmbed };
