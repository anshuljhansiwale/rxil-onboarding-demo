import express from 'express';
import cors from 'cors';
import { config, initConfig } from './config.js';
import { connectDb } from './db.js';
import { registrationsRouter } from './routes/registrations.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'RXIL Onboarding Demo API',
    mongodb: config.maskedMongoUri,
    database: config.dbName,
    atlas: config.isAtlas,
    vectorIndex: config.vectorIndexName,
    embeddings: {
      provider: 'voyage-ai',
      model: config.voyageModel,
      dimensions: config.embeddingDimensions,
    },
  });
});

app.use('/api/registrations', registrationsRouter);

async function main() {
  await initConfig();
  await connectDb();
  app.listen(config.port, () => {
    console.log(`RXIL demo API http://localhost:${config.port}`);
    console.log(`Health: http://localhost:${config.port}/api/health`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
