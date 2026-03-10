import { state } from './store.js';

function updatePanels(view) {
  const ids = { timeline: 'btnTimeline', graph: 'btnGraph', nodes: 'btnNodes', people: 'btnPeople' };
  Object.values(ids).forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById(ids[view]).classList.add('active');

  const panT = document.getElementById('timelinePanel');
  const panG = document.getElementById('graphPanel');
  const panN = document.getElementById('nodesPanel');
  const panP = document.getElementById('peoplePanel');
  const leg  = document.getElementById('legend');
  [panT, panG].forEach(p => { p.classList.add('hidden'); p.classList.remove('active'); });
  [panN, panP].forEach(p => p.classList.remove('active'));

  if      (view === 'timeline') { panT.classList.remove('hidden');              leg.style.display = ''; }
  else if (view === 'graph')    { panG.classList.remove('hidden'); panG.classList.add('active'); leg.style.display = ''; }
  else if (view === 'nodes')    { panN.classList.add('active');                 leg.style.display = 'none'; }
  else if (view === 'people')   { panP.classList.add('active');                 leg.style.display = 'none'; }
}

export async function switchView(view) {
  state.currentView = view;
  updatePanels(view);
  if      (view === 'timeline') { const m = await import('./timeline.js'); m.renderTimeline(); }
  else if (view === 'graph')    { const m = await import('./graph.js'); if (state.selectedNode) m.syncGraphCenter(state.selectedNode.id); else m.drawGraph(); }
  else if (view === 'nodes')    { const m = await import('./list.js');     m.renderNodesList(); }
  else if (view === 'people')   { const m = await import('./people.js');   m.renderPeople(); }
}

export function refreshCurrentView() { switchView(state.currentView); }

export function setupViewToggle() {
  document.getElementById('btnTimeline').addEventListener('click', () => switchView('timeline'));
  document.getElementById('btnGraph').addEventListener('click', () => switchView('graph'));
  document.getElementById('btnNodes').addEventListener('click', () => switchView('nodes'));
  document.getElementById('btnPeople').addEventListener('click', () => switchView('people'));
}

