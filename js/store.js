import { getData } from './dataloader.js';

// ── Data accessors (always read from loaded data) ─────────────
export function getElements()     { return getData().ELEMENTS; }
export function getElementIcons() { return getData().ELEMENT_ICONS; }
export function getScientists()   { return getData().SCIENTISTS; }
export function getDomains()      { return getData().DOMAINS; }
export function getTopics()       { return getData().TOPICS; }
export function getAllNodes()      { return getData().ALL_NODES; }
export function getEnabledBy()    { return getData().ENABLED_BY; }

// ── Global UI state (reset on data reload) ────────────────────
export const state = {
  activeTopics:   null,  // Set — initialized in initState()
  selectedNode:   null,
  selectedSci:    null,
  currentView:    'timeline',
  hiddenElements: new Set(),
  openDomains:    null,  // Set — initialized in initState()
};

export function initState() {
  const topics  = getTopics();
  const domains = getDomains();
  state.activeTopics   = new Set(Object.keys(topics));
  state.hiddenElements = new Set();
  state.openDomains    = new Set(Object.keys(domains));
  state.selectedNode   = null;
  state.selectedSci    = null;
  state.currentView    = 'timeline';
}

// ── Helpers ───────────────────────────────────────────────────
export function getActiveNodes() {
  const topics = getTopics();
  return [...state.activeTopics].flatMap(tid => topics[tid]?.nodes ?? []);
}

export function getTopicsForNode(nodeId) {
  const n = getAllNodes().find(n => n.id === nodeId);
  return n?.topicId ? [n.topicId] : [];
}

export function yearToLabel(y) { return y < 0 ? `−${Math.abs(y)}` : `${y}`; }

export function getActiveScientists() {
  const ids = new Set(getActiveNodes().map(n => n.id));
  return Object.entries(getScientists()).filter(([, s]) =>
    s.contributions.some(c => ids.has(c.nodeId))
  );
}

export function getScientistsForNode(nodeId) {
  return Object.entries(getScientists()).filter(([, s]) =>
    s.contributions.some(c => c.nodeId === nodeId)
  );
}

export function initials(name) {
  return name.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    || name[0].toUpperCase();
}

export function domainsForSci(sciId) {
  const sci = getScientists()[sciId];
  const seen = new Set();
  const result = [];
  for (const c of sci.contributions) {
    const node = getAllNodes().find(n => n.id === c.nodeId);
    if (!node) continue;
    const entry = Object.entries(getDomains()).find(([, d]) => d.topics.includes(node.topicId));
    if (entry && !seen.has(entry[0])) { seen.add(entry[0]); result.push(entry[1].label); }
  }
  return result.length ? result : ['Autre'];
}

export function clearDetail() {
  state.selectedNode = null;
  state.selectedSci  = null;
  document.getElementById('detailPanel')?.classList.add('empty');
  const content = document.getElementById('detailContent');
  if (content) content.style.display = 'none';
  const empty = document.getElementById('detailEmpty');
  if (empty) empty.classList.remove('hidden');
}
