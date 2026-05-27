import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { fetchAllExternalSources } from '../services/externalApis.js';
import { runVerification, enrichWithVectorSearch } from '../services/verification.js';

export const registrationsRouter = Router();

registrationsRouter.post('/', async (req, res) => {
  try {
    const db = getDb();
    const registrationId = uuidv4();
    const submittedAt = new Date();

    const userInput = {
      entityType: req.body.entityType,
      legalName: req.body.legalName,
      pan: req.body.pan,
      udyamNumber: req.body.udyamNumber,
      email: req.body.email,
      mobile: req.body.mobile,
      address: req.body.address,
      state: req.body.state,
      turnover: req.body.turnover,
      contactPersonName: req.body.contactPersonName,
      cin: req.body.cin,
    };

    if (!userInput.entityType || !userInput.legalName || !userInput.pan) {
      return res.status(400).json({ error: 'entityType, legalName, and pan are required' });
    }

    const externalResponses = await fetchAllExternalSources(userInput);
    const verification = await runVerification(userInput, externalResponses);
    const vectorInsights = await enrichWithVectorSearch(registrationId, verification);

    const record = {
      _id: registrationId,
      status: verification.decision,
      submittedAt,
      userInput,
      externalResponses,
      verification: { ...verification, vectorInsights },
      legacyProcess: {
        step: 'Maker-Checker queue',
        estimatedHours: 24,
        replacedBy: 'MongoDB Vector Search + semantic field matching',
      },
    };

    await db.collection('registrations').insertOne(record);

    res.status(201).json({
      registrationId,
      status: verification.decision,
      overallConfidence: verification.overallConfidence,
      decisionReason: verification.decisionReason,
      fieldResults: verification.fieldResults,
      vectorInsights,
      externalResponses,
      submittedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

registrationsRouter.get('/', async (_req, res) => {
  try {
    const db = getDb();
    const list = await db
      .collection('registrations')
      .find({}, { projection: { userInput: 1, status: 1, submittedAt: 1, 'verification.overallConfidence': 1 } })
      .sort({ submittedAt: -1 })
      .limit(50)
      .toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

registrationsRouter.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('registrations').findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
