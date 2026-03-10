import { ELEMENTS, ELEMENT_ICONS } from '../data/elements.js';
import { SCIENTISTS } from '../data/scientists.js';
import { TOPICS } from '../data/topics.js';
import { ALL_NODES, ENABLED_BY, state, yearToLabel, getScientistsForNode, getTopicsForNode, initials, domainsForSci, clearDetail } from './store.js';
import { switchView } from './views.js';
import { isMobile } from './mobile.js';

export function selectNode(node) {
  state.selectedNode = node;
  state.selectedSci = null;
  if (state.currentView === 'timeline') {
    import('./timeline.js').then(m => m.renderTimeline());
  } else if (state.currentView === 'nodes') {
    document.querySelectorAll('.node-list-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.id === node.id);
    });
  }
  showDetailNode(node);
  import('./graph.js').then(m => m.syncGraphCenter(node.id));
}

export function selectScientist(sciId) {
  state.selectedSci = sciId;
  state.selectedNode = null;
  if (state.currentView === 'timeline') {
    import('./timeline.js').then(m => m.renderTimeline());
  } else if (state.currentView === 'people') {
    document.querySelectorAll('.person-card').forEach(c => {
      c.classList.toggle('selected-sci', c.dataset.sciId === sciId);
    });
  }
  showDetailScientist(sciId);
}


// ─── Helpers HTML détail ─────────────────────────────────────
function relHtml(list, arrow, label) {
  if (!list.length) return '';
  return `<div><div class="detail-section-label">${label}</div><div class="relations-list">
    ${list.map(r => `
      <div class="relation-item" data-relate-id="${r.id}" data-relate-topic="${r.topicId ?? ''}">
        <div class="legend-dot" style="background:${ELEMENTS[r.element]?.color??'#888'}"></div>
        <span class="relation-arrow">${arrow}</span>
        <span class="relation-name">${r.name}</span>
        <span class="relation-year">${yearToLabel(r.year)}</span>
      </div>`).join('')}
  </div></div>`;
}

// ─── Détail nœud ─────────────────────────────────────────────
function showDetailNode(node) {
  document.getElementById('detailPanel').classList.remove('empty');
  document.getElementById('detailEmpty').classList.add('hidden');
  const content = document.getElementById('detailContent');
  content.style.display = 'block';

  const elInfo = ELEMENTS[node.element] ?? {};
  const icon = ELEMENT_ICONS[node.element] ?? '';
  const bases   = (node.relatesTo ?? []).map(id => ALL_NODES.find(n => n.id === id)).filter(Boolean);
  const enables = ENABLED_BY[node.id] ?? [];
  const topicsForNode = node.topicId ? [node.topicId] : getTopicsForNode(node.id);
  const sciForNode = getScientistsForNode(node.id);

  const STATUS_MAP = {
    confirmed:['status-confirmed','✓ Établi'],
    partial:  ['status-partial',  '~ Partiel / ambigu'],
    refuted:  ['status-refuted',  '✕ Réfuté'],
    open:     ['status-open',     '? Ouvert'],
  };
  const [statusClass, statusLabel] = STATUS_MAP[node.status] ?? ['status-open','?'];

  const refsHtml = !(node.refs?.length) ? '' : `
    <div><div class="detail-section-label">Références</div>
    <div class="refs-list">${node.refs.map(r => {
      const inner = r.url
        ? `<a class="ref-link" href="${r.url}" target="_blank" rel="noopener">${r.label}</a>`
        : `<span class="ref-cite">${r.label}</span>`;
      return `<div class="ref-item">${inner}</div>`;
    }).join('')}</div></div>`;

  const sciHtml = !sciForNode.length ? '' : `
    <div><div class="detail-section-label">Scientifiques</div><div class="relations-list">
      ${sciForNode.map(([sid,s]) => `
        <div class="relation-item sci-link" data-sci-id="${sid}">
          <div style="width:20px;height:20px;border-radius:50%;background:${s.color};display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:0.6rem;font-weight:700;color:var(--ink);flex-shrink:0">${initials(s.name)}</div>
          <span class="relation-name">${s.name}</span>
          <span class="relation-year">${yearToLabel(s.born)}</span>
        </div>`).join('')}
    </div></div>`;

  content.innerHTML = `
    <div class="detail-header">
      <span class="node-badge" style="background:${elInfo.color??'#888'}22;color:${elInfo.color??'#888'}">${icon}${elInfo.label??node.element}</span>
      <button class="detail-close-btn" id="detailCloseBtn">✕</button>
    </div>
    <div class="detail-body">
      <div class="detail-meta">
        <div class="detail-year">${yearToLabel(node.year)}</div>
        <div class="detail-title">${node.name}</div>
        ${node.author ? `<div class="detail-author">${node.author}</div>` : ''}
        ${node.humanReviewed === false ? `<span class="unreviewed-badge" style="margin-top:0.3rem">⚠ contenu non relu par un humain</span>` : ''}
      </div>
      ${topicsForNode.length ? `<div class="detail-topic-tags">${topicsForNode.map(tid=>`<span class="detail-topic-tag">${TOPICS[tid]?.label??tid}</span>`).join('')}</div>` : ''}
      <div class="divider"></div>
      <div><div class="detail-section-label">Description</div><div class="detail-desc markdown-body">${typeof marked !== 'undefined' ? marked.parse(node.description ?? node.excerpt ?? '') : (node.description ?? node.excerpt ?? '')}</div></div>
      ${refsHtml}
      <div><div class="detail-section-label">Statut épistémique</div><span class="status-badge ${statusClass}">${statusLabel}</span></div>
      ${relHtml(bases,   '↑', 'S\'appuie sur')}
      ${relHtml(enables, '↓', 'A permis de')}
      ${sciHtml}
    </div>`;

  document.getElementById('detailCloseBtn').addEventListener('click', clearDetail);
  content.querySelectorAll('.relation-item:not(.sci-link)').forEach(item => {
    item.addEventListener('click', () => {
      const topicId = item.dataset.relateTopic, nodeId = item.dataset.relateId;
      if (!state.activeTopics.has(topicId)) import('./sidebar.js').then(m => m.toggleTopic(topicId));
      requestAnimationFrame(() => {
        const target = ALL_NODES.find(n => n.id===nodeId);
        if (target) { selectNode(target); document.querySelector(`.node[data-id="${nodeId}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}); }
      });
    });
  });
  content.querySelectorAll('.sci-link').forEach(item => {
    item.addEventListener('click', () => selectScientist(item.dataset.sciId));
  });
  import('./mobile.js').then(m => m.openDetailMobile());
}

// ─── Détail scientifique ──────────────────────────────────────
function showDetailScientist(sciId) {
  const sci = SCIENTISTS[sciId]; if (!sci) return;
  document.getElementById('detailPanel').classList.remove('empty');
  document.getElementById('detailEmpty').classList.add('hidden');
  const content = document.getElementById('detailContent');
  content.style.display = 'block';

  const diedLabel = sci.died ? yearToLabel(sci.died) : '?';
  const bioHtml = typeof marked !== 'undefined' ? marked.parse(sci.bio ?? '') : (sci.bio ?? '');
  const domains = domainsForSci(sciId);
  const domainsHtml = `<div class="detail-topic-tags" style="margin-top:0.35rem">${domains.map(d => `<span class="detail-topic-tag">${d}</span>`).join('')}</div>`;
  const unreviewedHtml = sci.humanReviewed === false
    ? `<span class="unreviewed-badge" style="margin-top:0.3rem">⚠ contenu non relu par un humain</span>`
    : '';

  const contribHtml = sci.contributions.map(c => {
    const node = ALL_NODES.find(n => n.id === c.nodeId);
    if (!node) return '';
    const color = ELEMENTS[node.element]?.color ?? '#888';
    return `<div class="contrib-item" data-node-id="${node.id}" data-topic-id="${node.topicId ?? ''}">
      <div class="contrib-dot" style="background:${color}"></div>
      <div class="contrib-info">
        <div class="contrib-name">${node.name}</div>
        <div class="contrib-year">${yearToLabel(node.year)}</div>
      </div>
    </div>`;
  }).join('');

  content.innerHTML = `
    <div class="detail-header">
      <span class="node-badge" style="background:${sci.color}33;color:${sci.color}">
        <span style="font-size:0.85rem">${initials(sci.name)}</span>Scientifique
      </span>
      <button class="detail-close-btn" id="detailCloseBtn">✕</button>
    </div>
    <div class="detail-body">
      <div style="display:flex;gap:0.9rem;align-items:flex-start">
        <div class="person-detail-avatar" style="background:${sci.color}">${initials(sci.name)}</div>
        <div class="person-detail-header-info">
          <div class="detail-title" style="font-size:1.1rem">${sci.name}</div>
          <div class="detail-year">${yearToLabel(sci.born)} — ${diedLabel}</div>
          <div class="detail-author" style="margin-top:0.2rem">${sci.tagline}</div>
          ${domainsHtml}
          ${unreviewedHtml}
        </div>
      </div>
      <div class="divider"></div>
      <div><div class="detail-section-label">Biographie</div><div class="detail-desc markdown-body">${bioHtml}</div></div>
      <div><div class="detail-section-label">Contributions (${sci.contributions.length})</div>
        <div class="relations-list">${contribHtml}</div>
      </div>
    </div>`;

  document.getElementById('detailCloseBtn').addEventListener('click', clearDetail);
  content.querySelectorAll('.contrib-item').forEach(item => {
    item.addEventListener('click', () => {
      const nodeId = item.dataset.nodeId, topicId = item.dataset.topicId;
      if (!state.activeTopics.has(topicId)) import('./sidebar.js').then(m => m.toggleTopic(topicId));
      // Sur mobile, aller vers 'nodes' ; sur desktop vers 'timeline'
      const targetView = isMobile() ? 'nodes' : 'timeline';
      if (state.currentView !== targetView) switchView(targetView);
      requestAnimationFrame(() => {
        const target = ALL_NODES.find(n => n.id === nodeId);
        if (target) {
          selectNode(target);
          if (!isMobile()) document.querySelector(`.node[data-id="${nodeId}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
        }
      });
    });
  });
  import('./mobile.js').then(m => m.openDetailMobile());
}

