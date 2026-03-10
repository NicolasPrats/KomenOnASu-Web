import { SCIENTISTS } from '../data/scientists.js';
import { DOMAINS, TOPICS } from '../data/topics.js';

export { ELEMENTS, ELEMENT_ICONS } from '../data/elements.js';
export { SCIENTISTS } from '../data/scientists.js';
export { DOMAINS, TOPICS } from '../data/topics.js';

// ── Palette scientifiques & assignation dynamique ─────────────
const SCI_PALETTE = [
  '#e06c75', '#61afef', '#98c379', '#e5c07b', '#c678dd',
  '#56b6c2', '#d19a66', '#be5046', '#528bff', '#a9b1d6',
];

function assignScientistColors() {
  const sorted = Object.entries(SCIENTISTS).sort((a, b) => a[1].born - b[1].born);
  const n = sorted.length;
  const step = Math.ceil(n / 2);
  sorted.forEach(([id], i) => {
    SCIENTISTS[id].color = SCI_PALETTE[(i * step) % n % SCI_PALETTE.length];
  });
}
assignScientistColors();

// ── Bootstrap : bake topicId + index plat + index inversé ─────
Object.entries(TOPICS).forEach(([tid, topic]) => {
  topic.nodes.forEach(n => { n.topicId = tid; });
});

export const ALL_NODES = Object.values(TOPICS).flatMap(t => t.nodes);

export const ENABLED_BY = {};
ALL_NODES.forEach(n => {
  (n.relatesTo ?? []).forEach(tid => { (ENABLED_BY[tid] ??= []).push(n); });
});

// ── État global ───────────────────────────────────────────────
export const state = {
  activeTopics:   new Set(Object.keys(TOPICS)),
  selectedNode:   null,
  selectedSci:    null,
  currentView:    'timeline',
  hiddenElements: new Set(),
  openDomains:    new Set(Object.keys(DOMAINS)),
};

// ── Helpers ───────────────────────────────────────────────────
export function getActiveNodes() {
  return [...state.activeTopics].flatMap(tid => TOPICS[tid]?.nodes ?? []);
}

export function getTopicsForNode(nodeId) {
  const n = ALL_NODES.find(n => n.id === nodeId);
  return n?.topicId ? [n.topicId] : [];
}

export function yearToLabel(y) { return y < 0 ? `−${Math.abs(y)}` : `${y}`; }

export function getActiveScientists() {
  const ids = new Set(getActiveNodes().map(n => n.id));
  return Object.entries(SCIENTISTS).filter(([, s]) =>
    s.contributions.some(c => ids.has(c.nodeId))
  );
}

export function getScientistsForNode(nodeId) {
  return Object.entries(SCIENTISTS).filter(([, s]) =>
    s.contributions.some(c => c.nodeId === nodeId)
  );
}

export function initials(name) {
  return name.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    || name[0].toUpperCase();
}

// Re-export data for modules that import from store for convenience


// ── Helpers partagés (sans dépendances circulaires) ────────────
export function domainsForSci(sciId) {
  const sci = SCIENTISTS[sciId];
  const seen = new Set();
  const result = [];
  for (const c of sci.contributions) {
    const node = ALL_NODES.find(n => n.id === c.nodeId);
    if (!node) continue;
    const entry = Object.entries(DOMAINS).find(([, d]) => d.topics.includes(node.topicId));
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
