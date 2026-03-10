import { state, clearDetail } from './store.js';

export function isMobile() { return window.innerWidth <= 768; }

export function setupMobileDrawers() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('mobOverlay');
  const btnFilters = document.getElementById('btnFilters');

  function openSidebar() {
    sidebar.classList.add('mob-open');
    overlay.classList.add('active');
    btnFilters.classList.add('active');
    btnFilters.textContent = '✕ Fermer';
  }
  function closeSidebar() {
    sidebar.classList.remove('mob-open');
    overlay.classList.remove('active');
    btnFilters.classList.remove('active');
    btnFilters.textContent = '☰ Filtres';
  }

  btnFilters.addEventListener('click', () => {
    sidebar.classList.contains('mob-open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', () => {
    if (sidebar.classList.contains('mob-open')) {
      closeSidebar();
    } else {
      clearDetail();
    }
  });

  // Fermer la sidebar après sélection d'un topic sur mobile
  sidebar.addEventListener('click', e => {
    if (isMobile() && (e.target.closest('.topic-btn') || e.target.closest('.domain-check') || e.target.closest('.domain-label'))) {
      setTimeout(closeSidebar, 120);
    }
  });
}

export function openDetailMobile() {
  if (!isMobile()) return;
  document.getElementById('mobOverlay').classList.add('active');
}

