import { config } from '../config.js';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

/**
 * @param {string[]} texts
 * @param {{ inputType?: 'query' | 'document' }} [options]
 * @returns {Promise<number[][]>}
 */
export async function voyageEmbed(texts, options = {}) {
  const inputs = texts.map((t) => String(t ?? '').trim()).filter((t) => t.length > 0);
  if (inputs.length === 0) return [];

  const body = {
    input: inputs,
    model: config.voyageModel,
  };
  if (options.inputType) {
    body.input_type = options.inputType;
  }
  if (config.voyageOutputDimension) {
    body.output_dimension = config.voyageOutputDimension;
  }

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.voyageApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Voyage AI embeddings failed (${res.status}): ${errBody}`);
  }

  const json = await res.json();
  const embeddings = json.data?.map((d) => d.embedding) ?? [];

  if (embeddings.length !== inputs.length) {
    throw new Error('Voyage AI returned unexpected number of embeddings');
  }

  const dim = embeddings[0]?.length;
  if (dim && dim !== config.embeddingDimensions) {
    throw new Error(
      `Voyage embedding dimension (${dim}) does not match config (${config.embeddingDimensions}). Update vectorSearch.embeddingDimensions and recreate the Atlas Vector Search index.`,
    );
  }

  return embeddings;
}

/** Build a map of text → embedding (deduplicates API calls) */
export async function embedTextMap(texts, options = {}) {
  const unique = [...new Set(texts.map((t) => String(t ?? '').trim()).filter(Boolean))];
  const map = new Map();
  if (!unique.length) return map;

  const vectors = await voyageEmbed(unique, options);
  unique.forEach((text, i) => map.set(text, vectors[i]));
  return map;
}
