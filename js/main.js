import { initDataLoader } from './dataloader.js';
import { initState, state, clearDetail } from './store.js';
import { buildSidebar } from './sidebar.js';
import { buildLegend } from './legend.js';
import { buildSearch } from './search.js';
import { switchView, setupViewToggle } from './views.js';
import { setupNodesListToolbar } from './list.js';
import { setupPeopleToolbar } from './people.js';
import { setupMobileDrawers, isMobile } from './mobile.js';
import { initGraph } from './graph.js';
import { buildMenu } from './menu.js';

async function init() {
  // Load data before rendering anything
  let dataError = false;
  try {
    await initDataLoader();
  } catch {
    dataError = true;
    _showDataError();
  }

  if (dataError) return;

  initState();
  _render();
  buildMenu(_onDataReloaded);
}

function _render() {
  buildSidebar();
  buildLegend();
  buildSearch();
  setupViewToggle();
  setupNodesListToolbar();
  setupPeopleToolbar();
  setupMobileDrawers();

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') clearDetail();
    if (e.key === '/' && !e.target.closest('input')) {
      e.preventDefault();
      document.getElementById('searchInput').focus();
    }
  });

  const startView = isMobile() ? 'nodes' : 'timeline';
  switchView(startView);
  initGraph();

  window.addEventListener('resize', () => {
    if      (state.currentView === 'timeline') import('./timeline.js').then(m => m.renderTimeline());
    else if (state.currentView === 'graph')    import('./graph.js').then(m => m.drawGraph());
  });
}

// Called by menu.js after a successful version switch
function _onDataReloaded() {
  // Re-render all UI components from scratch
  buildSidebar();
  buildLegend();
  buildSearch();
  clearDetail();

  const startView = isMobile() ? 'nodes' : 'timeline';
  switchView(startView);
  import('./graph.js').then(m => { m.resetDagLayout(); });
}

function _showDataError() {
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      height:100vh;gap:1.2rem;font-family:'Crimson Pro',serif;color:#edeae2;background:#111210">
      <span style="font-size:2rem;opacity:0.4">⚠</span>
      <p style="color:#9a9890;font-size:1rem">Impossible de charger les données.</p>
      <button onclick="location.reload()"
        style="padding:0.4rem 1.2rem;background:transparent;border:1px solid #333530;
          color:#9a9890;font-family:'JetBrains Mono',monospace;font-size:0.7rem;
          cursor:pointer;letter-spacing:0.08em">
        Réessayer
      </button>
    </div>`;
}

document.addEventListener('DOMContentLoaded', init);
