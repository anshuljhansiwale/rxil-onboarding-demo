import dotenv from 'dotenv';
import { loadMongoDbConfig } from '../config/load-mongodb-config.js';

dotenv.config();

/** @type {Awaited<ReturnType<typeof loadMongoDbConfig>> | null} */
let mongoConfig = null;

/** Call once at startup before connecting to MongoDB */
export async function initConfig() {
  mongoConfig = await loadMongoDbConfig();
  return config;
}

function requireMongo() {
  if (!mongoConfig) {
    throw new Error('Config not initialized. Call initConfig() before using the database.');
  }
  return mongoConfig;
}

export const config = {
  get port() {
    return Number(process.env.PORT) || 4000;
  },
  get mongoUri() {
    return requireMongo().connectionString;
  },
  get dbName() {
    return requireMongo().databaseName;
  },
  get mongoAppName() {
    return requireMongo().appName;
  },
  get vectorIndexName() {
    return requireMongo().vectorIndexName;
  },
  get embeddingDimensions() {
    return requireMongo().embeddingDimensions;
  },
  get voyageApiKey() {
    return requireMongo().voyageApiKey;
  },
  get voyageModel() {
    return requireMongo().voyageModel;
  },
  get voyageOutputDimension() {
    return requireMongo().voyageOutputDimension;
  },
  get maskedMongoUri() {
    return requireMongo().maskedUri;
  },
  get isAtlas() {
    return requireMongo().isAtlas;
  },
};
