import { getActiveNodes, getElementIcons, getElements, state, yearToLabel } from './store.js';
import { selectNode } from './detail.js';

const nodesListState = { sort: 'year' };

const SORT_FNS = {
  year: (a, b) => a.year - b.year,
  type: (a, b) => a.element.localeCompare(b.element) || a.year - b.year,
};

export function renderNodesList() {
  const grid  = document.getElementById('nodesGrid');
  const count = document.getElementById('nodesCount');
  grid.innerHTML = '';

  // Sync sort buttons
  document.querySelectorAll('.nodes-sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === nodesListState.sort);
  });

  const seen   = new Set();
  const unique = getActiveNodes()
    .filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; })
    .sort(SORT_FNS[nodesListState.sort]);

  if (count) count.textContent = unique.length + ' élément' + (unique.length > 1 ? 's' : '');

  if (!unique.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem 1rem">
      <div style="font-size:1.8rem;opacity:0.2;margin-bottom:0.75rem">⊙</div>
      <div style="color:var(--muted);font-style:italic;font-size:0.9rem">Aucun élément actif.</div>
      <div style="color:var(--muted);font-size:0.78rem;margin-top:0.4rem">Activez des topics dans les <strong style="color:var(--paper)">Filtres</strong>.</div>
    </div>`;
    return;
  }

  unique.forEach((node, i) => {
    const elInfo = getElements()[node.element] ?? { color:'#888', label:node.element };
    const icon   = getElementIcons()[node.element] ?? '';
    const card   = document.createElement('div');
    const isSelected = state.selectedNode?.id === node.id;
    card.className = 'node-list-card' + (isSelected ? ' selected' : '');
    card.style.cssText = `border-left-color:${elInfo.color};animation-delay:${i*0.02}s`;
    card.dataset.id = node.id;

    const unreviewedHtml = node.humanReviewed === false
      ? `<span class="unreviewed-badge">⚠ non relu</span>`
      : '';

    card.innerHTML = `
      <div class="node-list-icon" style="color:${elInfo.color}">${icon}</div>
      <div class="node-list-info">
        <div class="node-list-name">${node.name} ${unreviewedHtml}</div>
        <div class="node-list-meta">${yearToLabel(node.year)}${node.author ? ' · ' + node.author : ''} · <span style="color:${elInfo.color}">${elInfo.label}</span></div>
        ${node.excerpt ? `<div class="node-list-excerpt">${node.excerpt}</div>` : ''}
      </div>`;
    card.addEventListener('click', () => selectNode(node));
    grid.appendChild(card);
  });
}

export function setupNodesListToolbar() {
  document.querySelectorAll('.nodes-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      nodesListState.sort = btn.dataset.sort;
      renderNodesList();
    });
  });
}

