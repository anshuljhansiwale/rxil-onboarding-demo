# RXIL TReDS Onboarding Demo — MongoDB Vector Search

Demo for [Receivables Exchange of India (RXIL)](https://www.rxil.in) showcasing how **MongoDB Atlas Vector Search** and **[Voyage AI](https://www.voyageai.com/)** embeddings can replace the manual **maker–checker** step in Corporate Buyer / MSME Seller pre-registration ([signup.treds.in](https://signup.treds.in/preRegistration)).

## What it demonstrates

| Step | Traditional (RXIL) | This demo |
|------|-------------------|-----------|
| Registration | Web form (PAN, Udyam, email, mobile, etc.) | Same fields — Buyer or Seller |
| Enrichment | CKYC, eProtean, Udyam APIs | **Simulated** APIs (deterministic mismatches ~25–30%) |
| Validation | Manual maker–checker compares fields | **Automated** embedding comparison + confidence % |
| Decision | Human queue (hours) | Auto-approve ≥85%, review 60–84%, reject &lt;60% |
| Intelligence | — | **$vectorSearch** on verified entity knowledge base |

## Architecture

```
User (React) → POST /api/registrations
                    ↓
              Simulated CKYC / eProtean / Udyam
                    ↓
              Embed fields via Voyage AI (voyage-3, 1024-d)
                    ↓
              Cosine similarity per field × source
                    ↓
              MongoDB: registrations + field_embeddings
                    ↓
              Atlas Vector Search → similar verified entities
```

## Prerequisites

- **Node.js 18+**
- **MongoDB Atlas** cluster with Vector Search enabled (all data is stored on Atlas)

## Quick start

```bash
cd rxil-onboarding-demo
npm run install:all

# 1. Create Atlas config (gitignored — holds your connection string)
npm run config:init
# Edit backend/config/mongodb.config.js:
#   - atlas.connectionString (Atlas → Connect → Drivers)
#   - voyage.apiKey (https://dash.voyageai.com/)

npm run setup:db    # creates collections + prints Vector Search index JSON for Atlas UI
npm run seed        # seeds verified_entity_knowledge (run after index is ACTIVE)

npm run dev         # API :4000 + UI :5173
```

### MongoDB Atlas configuration file

All storage uses **MongoDB Atlas** via `backend/config/mongodb.config.js`:

| Setting | Description |
|---------|-------------|
| `atlas.connectionString` | `mongodb+srv://...` from Atlas |
| `atlas.databaseName` | Database name (default `rxil_demo`) |
| `atlas.appName` | Application name in Atlas monitoring |
| `vectorSearch.indexName` | Vector Search index name |
| `voyage.apiKey` | [Voyage AI](https://www.voyageai.com/) API key (required) |
| `voyage.model` | Embedding model (default `voyage-3`) |
| `voyage.outputDimension` | Must match Atlas index (1024 for `voyage-3`) |

Template: `backend/config/mongodb.config.example.js`

Optional env overrides (CI): `MONGODB_URI`, `MONGODB_DB`, `VECTOR_INDEX_NAME`, `VOYAGE_API_KEY`, `VOYAGE_MODEL`

Open **http://localhost:5173**

1. Choose **Corporate Buyer** or **MSME Seller**
2. Use **Load buyer/seller sample** or enter PAN/legal name (mismatch rate is seeded from PAN)
3. Submit → watch external API simulation → field confidence scores → Vector Search insights

## Atlas Vector Search index

On your **Atlas** cluster, after `npm run setup:db`, create a **Vector Search** index on collection `verified_entity_knowledge` in database `rxil_demo`:

- **Index name:** `field_embedding_index` (must match `VECTOR_INDEX_NAME` in `.env`)
- **Vector field:** `profileEmbedding`
- **Dimensions:** `1024` (for `voyage-3`; use `512` if you switch to `voyage-3-lite`)
- **Similarity:** `cosine`

Optional second index on `field_embeddings.embedding` for cross-registration similarity (see setup script output).

Wait until index status is **ACTIVE**, then:

```bash
npm run seed
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/registrations` | Submit registration + run verification |
| GET | `/api/registrations` | List recent registrations |
| GET | `/api/registrations/:id` | Full record |

## Confidence model

- **Per comparison:** cosine similarity on **Voyage AI** embeddings (exact match for PAN / Udyam number)
- **Per field:** average across CKYC, eProtean, Udyam where applicable
- **Overall:** average across fields
- **Semantic tolerance:** e.g. `Pvt Ltd` ↔ `Private Limited` scores high; deliberate typos/variants score low

## Collections

| Collection | Purpose |
|------------|---------|
| `registrations` | Full audit trail (input, APIs, verification, decision) |
| `field_embeddings` | Per-field vectors for analytics / future vector queries |
| `verified_entity_knowledge` | Seeded “golden” profiles for `$vectorSearch` |

## Demo talking points (for SA presentations)

1. **Replace maker–checker** with explainable confidence scores per field and source.
2. **Vector Search** finds historically verified entities similar to the applicant profile (fraud / duplicate detection angle).
3. **Single platform:** operational data + embeddings + search in MongoDB (no separate vector DB).
4. **Extensible:** plug real CKYC/eProtean connectors; Voyage models (`voyage-3.5`, `voyage-law-2`) via config.

## Publish to GitHub

```bash
# One-time: authenticate GitHub CLI
gh auth login

# Create repo and push (default: anshuljhansiwale/rxil-onboarding-demo)
npm run publish:github

# Custom name or private repo:
# bash scripts/publish-to-github.sh my-repo-name private
```

Secrets (`mongodb.config.js`, `.env`) are gitignored and are not pushed.

## Disclaimer

Demonstration only — not connected to production RXIL or TReDS systems.
