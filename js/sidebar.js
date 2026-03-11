import { clearDetail, getDomains, getTopics, state } from './store.js';
import { refreshCurrentView } from './views.js';

export function buildSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';
  Object.entries(getDomains()).forEach(([domainId, domain]) => {
    const group = document.createElement('div');
    group.className = 'domain-group' + (state.openDomains.has(domainId) ? ' open' : '');
    group.dataset.domainId = domainId;

    const header = document.createElement('div');
    header.className = 'domain-header';

    // Flèche — repli/dépli uniquement
    const arrow = document.createElement('span');
    arrow.className = 'domain-arrow';
    arrow.textContent = '▶';
    arrow.addEventListener('click', e => {
      e.stopPropagation();
      group.classList.toggle('open');
      if (group.classList.contains('open')) state.openDomains.add(domainId);
      else state.openDomains.delete(domainId);
    });

    // Case à cocher du domaine
    const domainCheck = document.createElement('span');
    domainCheck.className = 'domain-check';
    const updateDomainCheck = () => {
      const topics = domain.topics.filter(t => getTopics()[t]);
      const allOn  = topics.every(t => state.activeTopics.has(t));
      const someOn = topics.some(t => state.activeTopics.has(t));
      domainCheck.dataset.state = allOn ? 'all' : someOn ? 'some' : 'none';
    };
    updateDomainCheck();

    // Label — tout cocher / tout décocher
    const label = document.createElement('span');
    label.className = 'domain-label';
    label.textContent = domain.label;

    // Clic sur check ou label = toggle tous les topics du domaine
    const toggleDomain = () => {
      const topics = domain.topics.filter(t => getTopics()[t]);
      const allOn = topics.every(t => state.activeTopics.has(t));
      if (allOn) {
        // Tout décocher — mais garder au moins 1 topic actif globalement
        const remaining = [...state.activeTopics].filter(t => !topics.includes(t));
        if (remaining.length === 0) return; // on ne peut pas tout décocher
        topics.forEach(t => state.activeTopics.delete(t));
      } else {
        topics.forEach(t => state.activeTopics.add(t));
      }
      refreshSidebarChecks();
      import('./graph.js').then(m => m.resetDagLayout());
      state.selectedNode = null; state.selectedSci = null;
      clearDetail();
      refreshCurrentView();
    };
    domainCheck.addEventListener('click', e => { e.stopPropagation(); toggleDomain(); });
    label.addEventListener('click', e => { e.stopPropagation(); toggleDomain(); });

    header.appendChild(arrow);
    header.appendChild(domainCheck);
    header.appendChild(label);

    const topicsDiv = document.createElement('div');
    topicsDiv.className = 'domain-topics';
    domain.topics.forEach(topicId => {
      const topic = getTopics()[topicId]; if (!topic) return;
      const btn = document.createElement('button');
      btn.className = 'topic-btn' + (state.activeTopics.has(topicId) ? ' active' : '');
      btn.dataset.topicId = topicId;
      btn.innerHTML = `<span class="topic-check"></span>${topic.label}`;
      btn.addEventListener('click', () => toggleTopic(topicId));
      topicsDiv.appendChild(btn);
    });
    group.appendChild(header); group.appendChild(topicsDiv);
    sidebar.appendChild(group);
  });
  const hint = document.createElement('div');
  hint.className = 'sidebar-hint';
  hint.textContent = 'Cliquer le domaine pour tout cocher/décocher';
  sidebar.appendChild(hint);
}

// Met à jour toutes les cases domaine + topics sans reconstruire la sidebar
export function refreshSidebarChecks() {
  document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.classList.toggle('active', state.activeTopics.has(btn.dataset.topicId));
  });
  document.querySelectorAll('.domain-group').forEach(group => {
    const domainId = group.dataset.domainId;
    if (!domainId) return;
    const topics = getDomains()[domainId].topics.filter(t => getTopics()[t]);
    const allOn  = topics.every(t => state.activeTopics.has(t));
    const someOn = topics.some(t => state.activeTopics.has(t));
    const dc = group.querySelector('.domain-check');
    if (dc) dc.dataset.state = allOn ? 'all' : someOn ? 'some' : 'none';
  });
}

export function toggleTopic(topicId) {
  if (state.activeTopics.has(topicId)) {
    if (state.activeTopics.size === 1) return;
    state.activeTopics.delete(topicId);
  } else {
    state.activeTopics.add(topicId);
  }
  refreshSidebarChecks();
  state.selectedNode = null;
  state.selectedSci  = null;
  clearDetail();
  refreshCurrentView();
}

