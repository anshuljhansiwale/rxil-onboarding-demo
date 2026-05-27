/**
 * Simulates CKYC, eProtean (MCA), and Udyam registry responses.
 * ~70% fields align with user input; ~30% introduce realistic mismatches.
 */

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickVariant(base, variants, seed) {
  return variants[seed % variants.length];
}

function normalizePan(pan) {
  return String(pan || '').toUpperCase().replace(/\s/g, '');
}

/** Deterministic "random" from PAN for reproducible demo */
function seedFromPan(pan) {
  const p = normalizePan(pan);
  let s = 0;
  for (let i = 0; i < p.length; i++) s = (s * 31 + p.charCodeAt(i)) >>> 0;
  return s;
}

const NAME_VARIANTS = (legalName) => [
  legalName,
  legalName.replace(/\bPrivate Limited\b/i, 'Pvt Ltd'),
  legalName.replace(/\bPvt\.?\s*Ltd\.?\b/i, 'Private Limited'),
  legalName.replace(/\bLLP\b/i, 'Limited Liability Partnership'),
  `${legalName.split(' ')[0]} Enterprises`, // deliberate mismatch
];

const ADDRESS_VARIANTS = (addr) => [
  addr,
  addr.replace(/Mumbai/gi, 'Mumbai'),
  addr.replace(/\bFloor\b/gi, 'Flr'),
  '701-702, Lodha Supremus, Kanjurmarg East, Mumbai 400042', // mismatch
];

export async function fetchCkyc(userInput) {
  await delay(400 + Math.random() * 300);
  const seed = seedFromPan(userInput.pan);
  const mismatch = seed % 5 === 0;

  return {
    source: 'CKYC',
    fetchedAt: new Date().toISOString(),
    status: 'SUCCESS',
    data: {
      pan: normalizePan(userInput.pan),
      legalName: mismatch
        ? pickVariant(userInput.legalName, NAME_VARIANTS(userInput.legalName), seed + 1)
        : userInput.legalName,
      registeredAddress: mismatch
        ? pickVariant(userInput.address, ADDRESS_VARIANTS(userInput.address), seed + 2)
        : userInput.address,
      email: mismatch && seed % 3 === 0 ? userInput.email.replace('@', '+kyc@') : userInput.email,
      mobile: userInput.mobile,
      kycStatus: 'VERIFIED',
      ckycReferenceId: `CKYC-${seed.toString(16).toUpperCase().slice(0, 8)}`,
    },
  };
}

export async function fetchEprotean(userInput) {
  await delay(500 + Math.random() * 400);
  const seed = seedFromPan(userInput.pan);
  const mismatch = seed % 4 === 1;

  return {
    source: 'eProtean (MCA)',
    fetchedAt: new Date().toISOString(),
    status: 'SUCCESS',
    data: {
      cin: userInput.cin || `U${seed % 9}0000MH2016PTC${(seed % 900000) + 100000}`,
      companyName: mismatch
        ? pickVariant(userInput.legalName, NAME_VARIANTS(userInput.legalName), seed + 3)
        : userInput.legalName,
      pan: normalizePan(userInput.pan),
      incorporationDate: '2016-03-15',
      companyStatus: 'Active',
      registeredOffice: mismatch
        ? ADDRESS_VARIANTS(userInput.address)[2]
        : userInput.address,
      authorizedSignatory: userInput.contactPersonName,
    },
  };
}

export async function fetchUdyam(userInput) {
  await delay(350 + Math.random() * 250);
  const seed = seedFromPan(userInput.pan);
  const mismatch = seed % 6 === 2;
  const udyam = userInput.udyamNumber || `UDYAM-MH-${(seed % 90) + 10}-0001234`;

  return {
    source: 'Udyam Registration',
    fetchedAt: new Date().toISOString(),
    status: 'SUCCESS',
    data: {
      udyamRegistrationNumber: udyam,
      enterpriseName: mismatch
        ? pickVariant(userInput.legalName, NAME_VARIANTS(userInput.legalName), seed + 4)
        : userInput.legalName,
      majorActivity: userInput.entityType === 'seller' ? 'Manufacturing' : 'Services',
      enterpriseType: 'Micro',
      dateOfRegistration: '2020-06-12',
      officialAddress: userInput.address,
      mobile: mismatch ? userInput.mobile.replace(/\d$/, (d) => String((Number(d) + 1) % 10)) : userInput.mobile,
      email: userInput.email,
    },
  };
}

export async function fetchAllExternalSources(userInput) {
  const [ckyc, eprotean, udyam] = await Promise.all([
    fetchCkyc(userInput),
    fetchEprotean(userInput),
    fetchUdyam(userInput),
  ]);
  return { ckyc, eprotean, udyam };
}
