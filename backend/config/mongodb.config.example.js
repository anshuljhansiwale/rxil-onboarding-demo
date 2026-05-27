/**
 * MongoDB Atlas + Voyage AI configuration (template)
 *
 * 1. Copy to mongodb.config.js:
 *      npm run config:init
 * 2. Set atlas.connectionString (Atlas → Connect → Drivers)
 * 3. Set voyage.apiKey (https://dash.voyageai.com/)
 *
 * mongodb.config.js is gitignored — do not commit credentials.
 */

export default {
  atlas: {
    connectionString: 'mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority',
    databaseName: 'rxil_demo',
    appName: 'rxil-onboarding-demo',
  },

  /** Voyage AI — sole embedding provider for field matching and Vector Search */
  voyage: {
    apiKey: '<your-voyage-api-key>',
    /** voyage-3 (1024-d), voyage-3-lite (512-d), voyage-3.5, etc. */
    model: 'voyage-3',
    /** Must match vectorSearch.embeddingDimensions and Atlas Vector Search index */
    outputDimension: 1024,
  },

  vectorSearch: {
    indexName: 'field_embedding_index',
    /** Must match voyage.outputDimension for your model */
    embeddingDimensions: 1024,
  },
};
