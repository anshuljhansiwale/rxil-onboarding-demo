/**
 * Creates collections and prints Atlas Vector Search index JSON.
 * On Atlas, create the search index via UI or Atlas Search API using the printed definition.
 */
import { MongoClient } from 'mongodb';
import { config, initConfig } from '../config.js';

const VECTOR_INDEX_DEF = {
  name: config.vectorIndexName,
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'profileEmbedding',
        numDimensions: config.embeddingDimensions,
        similarity: 'cosine',
      },
      {
        type: 'filter',
        path: 'entityType',
      },
    ],
  },
};

const FIELD_EMBEDDING_INDEX_DEF = {
  name: 'field_embeddings_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: config.embeddingDimensions,
        similarity: 'cosine',
      },
      {
        type: 'filter',
        path: 'field',
      },
      {
        type: 'filter',
        path: 'registrationId',
      },
    ],
  },
};

async function main() {
  await initConfig();
  const client = new MongoClient(config.mongoUri, { appName: config.mongoAppName });
  await client.connect();
  const db = client.db(config.dbName);

  await db.createCollection('registrations').catch(() => {});
  await db.createCollection('field_embeddings').catch(() => {});
  await db.createCollection('verified_entity_knowledge').catch(() => {});

  await db.collection('registrations').createIndex({ submittedAt: -1 });
  await db.collection('field_embeddings').createIndex({ registrationId: 1 });
  await db.collection('verified_entity_knowledge').createIndex({ pan: 1 }, { unique: true });

  console.log('\n=== RXIL Demo — MongoDB Atlas setup ===\n');
  console.log(`Cluster: ${config.maskedMongoUri}`);
  console.log(`Database: ${config.dbName}`);
  console.log('\nRegular indexes created on registrations, field_embeddings, verified_entity_knowledge.\n');
  console.log('Create these Atlas Vector Search indexes (Search tab → Create Search Index → JSON Editor):\n');
  console.log('--- verified_entity_knowledge ---');
  console.log(JSON.stringify(VECTOR_INDEX_DEF, null, 2));
  console.log('\n--- field_embeddings (optional, for cross-registration similarity) ---');
  console.log(JSON.stringify(FIELD_EMBEDDING_INDEX_DEF, null, 2));
  console.log('\nIndex name for API must match VECTOR_INDEX_NAME:', config.vectorIndexName);
  console.log('\nThen run: npm run seed\n');

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
