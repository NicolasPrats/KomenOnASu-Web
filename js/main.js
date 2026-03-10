import { buildSidebar } from './sidebar.js';
import { buildLegend } from './legend.js';
import { buildSearch } from './search.js';
import { switchView, setupViewToggle } from './views.js';
import { setupNodesListToolbar } from './list.js';
import { setupPeopleToolbar } from './people.js';
import { setupMobileDrawers, isMobile } from './mobile.js';
import { initGraph } from './graph.js';
import { clearDetail } from './store.js';
import { state } from './store.js';

function init() {
  buildSidebar();
  buildLegend();
  buildSearch();
  setupViewToggle();
  setupNodesListToolbar();
  setupPeopleToolbar();
  setupMobileDrawers();

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { clearDetail(); }
    if (e.key === '/' && !e.target.closest('input')) { e.preventDefault(); document.getElementById('searchInput').focus(); }
  });

  const startView = isMobile() ? 'nodes' : 'timeline';
  switchView(startView);

  initGraph();
  window.addEventListener('resize', () => {
    if      (state.currentView === 'timeline') import('./timeline.js').then(m => m.renderTimeline());
    else if (state.currentView === 'graph')    import('./graph.js').then(m => m.drawGraph());
  });
}

document.addEventListener('DOMContentLoaded', init);
