import { useState } from 'react';
import './App.css';

const SAMPLE_BUYER = {
  entityType: 'buyer',
  legalName: 'RS Infraprojects Private Limited',
  pan: 'AABCR1234A',
  udyamNumber: '',
  email: 'finance@rsinfraprojects.com',
  mobile: '9876543210',
  address: '701-702, Lodha Supremus, Kanjurmarg East, Mumbai 400042',
  state: 'Maharashtra',
  turnover: '50-100 Cr',
  contactPersonName: 'Manoj Goel',
  cin: 'U45200MH2010PTC123456',
};

const SAMPLE_SELLER = {
  entityType: 'seller',
  legalName: 'United Telecom Ventures Pvt Ltd',
  pan: 'AAECU5678B',
  udyamNumber: 'UDYAM-MH-12-0001234',
  email: 'accounts@unitedtelecom.in',
  mobile: '9123456789',
  address: 'Plot 14, MIDC, Pune, Maharashtra 411019',
  state: 'Maharashtra',
  turnover: '5-10 Cr',
  contactPersonName: 'Sandeep S Tamhankar',
  cin: '',
};

const EMPTY = {
  entityType: 'buyer',
  legalName: '',
  pan: '',
  udyamNumber: '',
  email: '',
  mobile: '',
  address: '',
  state: '',
  turnover: '',
  contactPersonName: '',
  cin: '',
};

function ConfidenceRing({ value }) {
  const color =
    value >= 85 ? 'var(--success)' : value >= 60 ? 'var(--warn)' : 'var(--danger)';
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="confidence-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e8edf3" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <span className="confidence-value" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    AUTO_APPROVED: { label: 'Auto Approved', cls: 'badge-success' },
    MANUAL_REVIEW: { label: 'Manual Review', cls: 'badge-warn' },
    REJECTED: { label: 'Rejected', cls: 'badge-danger' },
    match: { label: 'Match', cls: 'badge-success' },
    review: { label: 'Review', cls: 'badge-warn' },
    mismatch: { label: 'Mismatch', cls: 'badge-danger' },
  };
  const m = map[status] || { label: status, cls: '' };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function RegistrationForm({ form, setForm, onSubmit, loading }) {
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="card form-card"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h2>Pre-registration</h2>
      <p className="subtitle">
        Mimics{' '}
        <a href="https://signup.treds.in/preRegistration" target="_blank" rel="noreferrer">
          signup.treds.in
        </a>{' '}
        — Corporate Buyer or MSME Seller
      </p>

      <div className="entity-toggle">
        <button
          type="button"
          className={form.entityType === 'buyer' ? 'active' : ''}
          onClick={() => update('entityType', 'buyer')}
        >
          Corporate Buyer
        </button>
        <button
          type="button"
          className={form.entityType === 'seller' ? 'active' : ''}
          onClick={() => update('entityType', 'seller')}
        >
          MSME Seller
        </button>
      </div>

      <div className="sample-row">
        <button type="button" className="link-btn" onClick={() => setForm(SAMPLE_BUYER)}>
          Load buyer sample
        </button>
        <button type="button" className="link-btn" onClick={() => setForm(SAMPLE_SELLER)}>
          Load seller sample
        </button>
        <button type="button" className="link-btn" onClick={() => setForm(EMPTY)}>
          Clear
        </button>
      </div>

      <div className="grid-2">
        <label>
          Legal name *
          <input value={form.legalName} onChange={(e) => update('legalName', e.target.value)} required />
        </label>
        <label>
          PAN *
          <input
            value={form.pan}
            onChange={(e) => update('pan', e.target.value.toUpperCase())}
            placeholder="AAAAA9999A"
            required
          />
        </label>
        {form.entityType === 'seller' && (
          <label>
            Udyam registration no.
            <input value={form.udyamNumber} onChange={(e) => update('udyamNumber', e.target.value)} />
          </label>
        )}
        {form.entityType === 'buyer' && (
          <label>
            CIN (optional)
            <input value={form.cin} onChange={(e) => update('cin', e.target.value)} />
          </label>
        )}
        <label>
          Email *
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        </label>
        <label>
          Mobile *
          <input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} required />
        </label>
        <label className="full">
          Registered address *
          <textarea value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} required />
        </label>
        <label>
          State
          <input value={form.state} onChange={(e) => update('state', e.target.value)} />
        </label>
        <label>
          Turnover
          <input value={form.turnover} onChange={(e) => update('turnover', e.target.value)} />
        </label>
        <label>
          Contact person
          <input value={form.contactPersonName} onChange={(e) => update('contactPersonName', e.target.value)} />
        </label>
      </div>

      <button type="submit" className="primary-btn" disabled={loading}>
        {loading ? 'Verifying with MongoDB Vector Search…' : 'Submit & run AI verification'}
      </button>
    </form>
  );
}

function ResultsPanel({ result }) {
  if (!result) return null;

  return (
    <div className="results">
      <div className="card summary-card">
        <div className="summary-left">
          <h2>Verification outcome</h2>
          <StatusBadge status={result.status} />
          <p className="decision-reason">{result.decisionReason}</p>
          <div className="legacy-compare">
            <div className="legacy old">
              <strong>Before</strong>
              <span>Manual maker–checker (24h SLA)</span>
            </div>
            <div className="legacy new">
              <strong>After</strong>
              <span>Voyage AI + MongoDB Vector Search (&lt;1 min)</span>
            </div>
          </div>
        </div>
        <ConfidenceRing value={result.overallConfidence} />
      </div>

      <div className="card">
        <h3>External API responses (simulated)</h3>
        <div className="api-grid">
          {['ckyc', 'eprotean', 'udyam'].map((key) => (
            <details key={key} open={key === 'ckyc'}>
              <summary>{result.externalResponses[key].source}</summary>
              <pre>{JSON.stringify(result.externalResponses[key].data, null, 2)}</pre>
            </details>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Field-level semantic comparison</h3>
        <p className="subtitle">
          Voyage AI cosine similarity — handles &quot;Pvt Ltd&quot; vs &quot;Private Limited&quot;
        </p>
        <div className="field-table">
          {result.fieldResults.map((field) => (
            <div key={field.field} className="field-row">
              <div className="field-header">
                <span className="field-name">{field.label}</span>
                {field.aggregateConfidence != null && (
                  <span className="field-conf">{field.aggregateConfidence}% avg</span>
                )}
              </div>
              {field.comparisons.map((c, i) => (
                <div key={i} className="comparison">
                  <span className="source-tag">{c.externalSource}</span>
                  <div className="values">
                    <div>
                      <small>User input</small>
                      <div>{c.userValue || '—'}</div>
                    </div>
                    <div>
                      <small>External API</small>
                      <div>{c.externalValue || '—'}</div>
                    </div>
                  </div>
                  <div className="comp-meta">
                    <StatusBadge status={c.status} />
                    <span className="conf-pill">{c.confidence}% confidence</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${c.confidence}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {result.vectorInsights?.length > 0 && (
        <div className="card vector-card">
          <h3>MongoDB Atlas Vector Search</h3>
          <p className="subtitle">Similar verified entities from knowledge base ($vectorSearch)</p>
          {result.vectorInsights.map((vi) => (
            <div key={vi.field} className="vector-insight">
              <strong>{vi.label}</strong>
              <p className="note">{vi.note}</p>
              {vi.similarEntities?.length > 0 ? (
                <ul>
                  {vi.similarEntities.map((e, i) => (
                    <li key={i}>
                      {e.legalName} ({e.entityType}) — score {(e.score ?? 0).toFixed(3)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No similar entities (create vector index + run seed)</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState(SAMPLE_BUYER);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('');

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    setStep('Submitting registration…');

    try {
      setStep('Calling CKYC, eProtean, Udyam (simulated)…');
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setStep('');
      setResult(data);
    } catch (e) {
      setError(e.message);
      setStep('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="logo">RXIL</span>
            <div>
              <h1>TReDS Onboarding Demo</h1>
              <p>Receivables Exchange of India — MongoDB Vector Search</p>
            </div>
          </div>
          <a className="header-link" href="https://www.rxil.in" target="_blank" rel="noreferrer">
            rxil.in
          </a>
        </div>
      </header>

      <main className="main">
        <section className="hero card">
          <p>
            This demo replaces the manual <strong>maker–checker</strong> validation step with automated
            semantic field matching. User registration data is compared against simulated CKYC, eProtean,
            and Udyam responses using <strong>Voyage AI embeddings</strong> and{' '}
            <strong>MongoDB Atlas Vector Search</strong>.
          </p>
        </section>

        {loading && (
          <div className="loading-banner card">
            <div className="spinner" />
            <span>{step}</span>
          </div>
        )}

        {error && <div className="error-banner card">{error}</div>}

        <div className="layout">
          <RegistrationForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={loading} />
          <ResultsPanel result={result} />
        </div>
      </main>

      <footer className="footer">
        MongoDB Solution Architect demo — not affiliated with production RXIL systems
      </footer>
    </div>
  );
}
