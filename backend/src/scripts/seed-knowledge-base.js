import { MongoClient } from 'mongodb';
import { config, initConfig } from '../config.js';
import { embedText } from '../services/embeddings.js';

const ENTITIES = [
  {
    legalName: 'RS Infraprojects Private Limited',
    entityType: 'buyer',
    pan: 'AABCR1234A',
    profileText:
      'RS Infraprojects Private Limited PAN AABCR1234A Mumbai infrastructure buyer corporate',
  },
  {
    legalName: 'United Telecom Ventures Pvt Ltd',
    entityType: 'seller',
    pan: 'AAECU5678B',
    profileText:
      'United Telecom Ventures Pvt Ltd MSME seller telecom Maharashtra UDYAM',
  },
  {
    legalName: 'Sunvoice Electronics Pvt Ltd',
    entityType: 'seller',
    pan: 'AABCS9012C',
    profileText:
      'Sunvoice Electronics Pvt Ltd electronics MSME seller manufacturing',
  },
  {
    legalName: 'Victor Component Group',
    entityType: 'seller',
    pan: 'AABCV3456D',
    profileText: 'Victor Component Group components MSME seller',
  },
];

async function main() {
  await initConfig();
  const client = new MongoClient(config.mongoUri, { appName: config.mongoAppName });
  await client.connect();
  const coll = client.db(config.dbName).collection('verified_entity_knowledge');

  for (const e of ENTITIES) {
    const profileEmbedding = await embedText(e.profileText);
    await coll.updateOne(
      { pan: e.pan },
      {
        $set: {
          ...e,
          profileEmbedding,
          embeddingProvider: 'voyage-ai',
          voyageModel: config.voyageModel,
          verifiedAt: new Date(),
          source: 'RXIL historical onboarding',
        },
      },
      { upsert: true },
    );
    console.log('Seeded:', e.legalName);
  }

  console.log(`\n${ENTITIES.length} verified entities in verified_entity_knowledge`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
