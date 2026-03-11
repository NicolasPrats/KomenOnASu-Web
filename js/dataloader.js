const DATA_REPO_BASE  = 'https://nicolasprats.github.io/KomenOnASu-Data';
const VERSIONS_URL    = `${DATA_REPO_BASE}/versions.json`;
export const LOCAL_VERSION = 'local';
const LOCAL_DATA_PATH = './data/data.json';

// ── Internal state ────────────────────────────────────────────
let _currentVersion    = LOCAL_VERSION;
let _availableVersions = [LOCAL_VERSION];
let _data              = null;

// ── Public accessors ──────────────────────────────────────────
export function getCurrentVersion()    { return _currentVersion; }
export function getAvailableVersions() { return _availableVersions; }

export function getData() {
  if (!_data) throw new Error('Data not loaded — call initDataLoader() first');
  return _data;
}

// ── Bootstrap: called once on app start ──────────────────────
// Default: load latest remote version; fall back to local if unavailable.
export async function initDataLoader() {
  await _fetchAvailableVersions();

  const latestRemote = _availableVersions.find(v => v !== LOCAL_VERSION);
  try {
    await loadData(latestRemote ?? LOCAL_VERSION);
  } catch {
    // Remote failed — fall back to local silently
    await loadData(LOCAL_VERSION);
  }
}

// ── Load a specific version ───────────────────────────────────
export async function loadData(version) {
  const url = version === LOCAL_VERSION
    ? LOCAL_DATA_PATH
    : `${DATA_REPO_BASE}/${version}/data.json`;

  const raw = await _fetchJson(url);
  if (!raw) throw new Error(`Failed to load data for version "${version}"`);

  _data           = _bootstrapData(raw);
  _currentVersion = version;
}

// ── Fetch available versions from gh-pages ────────────────────
async function _fetchAvailableVersions() {
  const data = await _fetchJson(VERSIONS_URL);
  if (Array.isArray(data?.versions) && data.versions.length > 0) {
    // Remote versions newest-first, local at the end as fallback
    _availableVersions = [...data.versions, LOCAL_VERSION];
  }
  // If fetch failed, _availableVersions stays [LOCAL_VERSION]
}

// ── Bootstrap: enrich raw JSON data ──────────────────────────
function _bootstrapData(raw) {
  const { ELEMENTS, ELEMENT_ICONS, SCIENTISTS, DOMAINS, TOPICS } = raw;

  const SCI_PALETTE = [
    '#e06c75','#61afef','#98c379','#e5c07b','#c678dd',
    '#56b6c2','#d19a66','#be5046','#528bff','#a9b1d6',
  ];
  const sorted = Object.entries(SCIENTISTS).sort((a, b) => a[1].born - b[1].born);
  const n    = sorted.length;
  const step = Math.ceil(n / 2);
  sorted.forEach(([id], i) => {
    SCIENTISTS[id].color = SCI_PALETTE[(i * step) % n % SCI_PALETTE.length];
  });

  Object.entries(TOPICS).forEach(([tid, topic]) => {
    topic.nodes.forEach(node => { node.topicId = tid; });
  });

  const ALL_NODES = Object.values(TOPICS).flatMap(t => t.nodes);
  const ENABLED_BY = {};
  ALL_NODES.forEach(node => {
    (node.relatesTo ?? []).forEach(tid => { (ENABLED_BY[tid] ??= []).push(node); });
  });

  return { ELEMENTS, ELEMENT_ICONS, SCIENTISTS, DOMAINS, TOPICS, ALL_NODES, ENABLED_BY };
}

// ── Generic JSON fetch with timeout ──────────────────────────
async function _fetchJson(url) {
  try {
    const ctrl    = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    const res     = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
