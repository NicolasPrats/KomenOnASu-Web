import { SCIENTISTS } from '../data/scientists.js';
import { DOMAINS, TOPICS } from '../data/topics.js';
import { ALL_NODES, state, yearToLabel, getActiveScientists, initials, domainsForSci } from './store.js';
import { selectScientist } from './detail.js';

const peopleListState = { sort: 'date' };

// Domaines distincts d'un scientifique, déduits de ses contributions

const PEOPLE_SORT_FNS = {
  date:   ([, a], [, b]) => a.born - b.born,
  name:   ([, a], [, b]) => a.name.localeCompare(b.name, 'fr'),
  domain: ([idA], [idB]) => domainsForSci(idA)[0].localeCompare(domainsForSci(idB)[0], 'fr'),
};

export function renderPeople() {
  const grid  = document.getElementById('peopleGrid');
  const count = document.getElementById('peopleCount');
  grid.innerHTML = '';

  // Sync sort buttons
  document.querySelectorAll('.people-sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === peopleListState.sort);
  });

  const activeSci = getActiveScientists().sort(PEOPLE_SORT_FNS[peopleListState.sort]);

  if (count) count.textContent = activeSci.length + ' scientifique' + (activeSci.length > 1 ? 's' : '');

  if (!activeSci.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem 1rem">
      <div style="font-size:1.8rem;opacity:0.2;margin-bottom:0.75rem">⊙</div>
      <div style="color:var(--muted);font-style:italic;font-size:0.9rem">Aucun scientifique associé aux topics actifs.</div>
      <div style="color:var(--muted);font-size:0.78rem;margin-top:0.4rem">Activez des topics dans les <strong style="color:var(--paper)">Filtres</strong>.</div>
    </div>`;
    return;
  }

  activeSci.forEach(([sciId, sci], i) => {
    const card = document.createElement('div');
    card.className = 'person-card' + (state.selectedSci === sciId ? ' selected-sci' : '');
    card.style.cssText = `border-left-color:${sci.color};animation-delay:${i*0.04}s`;
    card.dataset.sciId = sciId;

    const diedLabel = sci.died ? yearToLabel(sci.died) : '?';
    const contribCount = sci.contributions.length;
    const domains = domainsForSci(sciId).join(', ');

    card.innerHTML = `
      <div class="person-avatar" style="background:${sci.color}">${initials(sci.name)}</div>
      <div class="person-info">
        <div class="person-name">${sci.name}</div>
        <div class="person-dates">${yearToLabel(sci.born)} → ${diedLabel}</div>
        <div class="person-tagline">${sci.tagline}</div>
        <div class="person-contrib-count">${contribCount} contribution${contribCount>1?'s':''} · ${domains}</div>
      </div>`;
    card.addEventListener('click', () => selectScientist(sciId));
    grid.appendChild(card);
  });
}

export function setupPeopleToolbar() {
  document.querySelectorAll('.people-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      peopleListState.sort = btn.dataset.sort;
      renderPeople();
    });
  });
}

