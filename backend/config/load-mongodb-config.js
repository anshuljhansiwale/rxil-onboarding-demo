import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, 'mongodb.config.js');

const PLACEHOLDER_PATTERN = /<username>|<password>|<cluster>/;

function maskUri(uri) {
  return String(uri || '').replace(/\/\/([^@/]+)@/, '//***@');
}

function validateAtlasUri(uri) {
  if (!uri || typeof uri !== 'string') {
    throw new Error(
      'MongoDB Atlas connection string is missing. Copy config/mongodb.config.example.js to config/mongodb.config.js and set atlas.connectionString.',
    );
  }
  if (PLACEHOLDER_PATTERN.test(uri)) {
    throw new Error(
      'MongoDB Atlas connection string still contains placeholders. Edit backend/config/mongodb.config.js with your real Atlas URI.',
    );
  }
  if (!uri.startsWith('mongodb+srv://') && !uri.startsWith('mongodb://')) {
    throw new Error('Invalid MongoDB URI. Atlas clusters typically use mongodb+srv://');
  }
  return uri;
}

/**
 * Loads Atlas settings from config/mongodb.config.js.
 * Environment variables override the file (useful for CI):
 *   MONGODB_URI, MONGODB_DB, VECTOR_INDEX_NAME
 */
export async function loadMongoDbConfig() {
  let fileConfig = {};

  if (existsSync(CONFIG_PATH)) {
    const mod = await import(pathToFileURL(CONFIG_PATH).href);
    fileConfig = mod.default ?? mod;
  } else if (!process.env.MONGODB_URI) {
    throw new Error(
      `MongoDB config not found at ${CONFIG_PATH}. Run: cp config/mongodb.config.example.js config/mongodb.config.js`,
    );
  }

  const atlas = fileConfig.atlas ?? {};
  const vectorSearch = fileConfig.vectorSearch ?? {};
  const voyage = fileConfig.voyage ?? {};

  // Config file is primary; env vars override for CI/deployment
  const connectionString = validateAtlasUri(
    atlas.connectionString || process.env.MONGODB_URI,
  );
  const databaseName =
    atlas.databaseName || process.env.MONGODB_DB || 'rxil_demo';
  const appName = atlas.appName || 'rxil-onboarding-demo';
  const vectorIndexName =
    vectorSearch.indexName || process.env.VECTOR_INDEX_NAME || 'field_embedding_index';
  const voyageModel = voyage.model || process.env.VOYAGE_MODEL || 'voyage-3';
  const voyageApiKey = voyage.apiKey || process.env.VOYAGE_API_KEY;
  const voyageOutputDimension =
    voyage.outputDimension ?? vectorSearch.embeddingDimensions ?? 1024;

  if (!voyageApiKey || voyageApiKey === '<your-voyage-api-key>') {
    throw new Error(
      'Voyage AI API key is missing. Set voyage.apiKey in config/mongodb.config.js (get one at https://dash.voyageai.com/).',
    );
  }

  const modelDimensions = {
    'voyage-3': 1024,
    'voyage-3-lite': 512,
    'voyage-3-large': 1024,
    'voyage-3.5': 1024,
    'voyage-3.5-lite': 1024,
    'voyage-4': 1024,
    'voyage-4-lite': 1024,
    'voyage-4-large': 1024,
  };
  const embeddingDimensions =
    voyageOutputDimension || modelDimensions[voyageModel] || 1024;

  return {
    connectionString,
    databaseName,
    appName,
    vectorIndexName,
    embeddingDimensions,
    voyageApiKey,
    voyageModel,
    voyageOutputDimension: embeddingDimensions,
    maskedUri: maskUri(connectionString),
    isAtlas: connectionString.startsWith('mongodb+srv://'),
  };
}
