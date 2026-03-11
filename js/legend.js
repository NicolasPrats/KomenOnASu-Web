import { getElements, state } from './store.js';
import { refreshCurrentView } from './views.js';

export function buildLegend() {
  const container = document.getElementById('legend');
  container.innerHTML = '';
  Object.entries(getElements()).forEach(([id, el]) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<div class="legend-dot" style="background:${el.color}"></div>${el.label}`;
    item.addEventListener('click', () => {
      if (state.hiddenElements.has(id)) { state.hiddenElements.delete(id); item.classList.remove('hidden-type'); }
      else { state.hiddenElements.add(id); item.classList.add('hidden-type'); }
      refreshCurrentView();
    });
    container.appendChild(item);
  });
}

