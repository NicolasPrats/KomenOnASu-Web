import { getAllNodes, getElements, getScientists, getTopics, state, yearToLabel } from './store.js';
import { toggleTopic } from './sidebar.js';
import { switchView } from './views.js';
import { selectNode, selectScientist } from './detail.js';
import { isMobile } from './mobile.js';

export function buildSearch() {
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  input.addEventListener('input', () => {
    const q = norm(input.value.trim());
    if (!q) { results.classList.remove('open'); return; }
    const nodeMatches = getAllNodes().filter(n =>
      norm(n.name).includes(q) || norm(n.author??'').includes(q) || norm(n.excerpt??'').includes(q)
    ).slice(0,5);
    const sciMatches = Object.entries(getScientists()).filter(([,s]) =>
      norm(s.name).includes(q) || norm(s.tagline).includes(q)
    ).slice(0,3);
    if (!nodeMatches.length && !sciMatches.length) { results.classList.remove('open'); return; }
    results.innerHTML = [
      ...nodeMatches.map(n => {
        const c = getElements()[n.element]?.color ?? '#888';
        return `<div class="search-result-item" data-type="node" data-id="${n.id}" data-topic="${n.topicId}">
          <div class="res-dot" style="background:${c}"></div>
          <span class="res-name">${n.name}</span>
          <span class="res-topic">${getTopics()[n.topicId]?.label??''}</span>
          <span class="res-year">${yearToLabel(n.year)}</span>
        </div>`;
      }),
      ...sciMatches.map(([id,s]) =>
        `<div class="search-result-item" data-type="sci" data-id="${id}">
          <div class="res-dot" style="background:${s.color};border-radius:2px"></div>
          <span class="res-name">${s.name}</span>
          <span class="res-topic">Scientifique</span>
          <span class="res-year">${yearToLabel(s.born)}</span>
        </div>`
      )
    ].join('');
    results.classList.add('open');
    results.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        results.classList.remove('open'); input.value = '';
        if (item.dataset.type === 'node') {
          const topicId = item.dataset.topic, nodeId = item.dataset.id;
          if (!state.activeTopics.has(topicId)) toggleTopic(topicId);
          const targetView = isMobile() ? 'nodes' : 'timeline';
          if (state.currentView !== targetView) switchView(targetView);
          requestAnimationFrame(() => {
            const node = getAllNodes().find(n => n.id === nodeId);
            if (node) {
              selectNode(node);
              if (!isMobile()) document.querySelector(`.node[data-id="${nodeId}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
            }
          });
        } else {
          selectScientist(item.dataset.id);
        }
      });
    });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.search-wrapper')) results.classList.remove('open'); });
}

