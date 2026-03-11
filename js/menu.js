import { getCurrentVersion, getAvailableVersions, loadData, LOCAL_VERSION } from './dataloader.js';
import { initState } from './store.js';

export function buildMenu(onDataReloaded) {
  _bindEvents(onDataReloaded);
  _updateVersionLabel();
}

// ── Open / close ──────────────────────────────────────────────
function _openMenu() {
  _renderVersionList();
  document.getElementById('menuDropdown').classList.add('open');
  document.getElementById('menuBtn').setAttribute('aria-expanded', 'true');
}

function _closeMenu() {
  const dropdown = document.getElementById('menuDropdown');
  const submenu  = document.getElementById('versionSubmenu');
  const entry    = document.getElementById('versionEntry');

  dropdown.classList.remove('open', 'loading');
  dropdown.style.pointerEvents = '';
  submenu.classList.remove('open');
  entry.classList.remove('active');
  document.getElementById('menuBtn').setAttribute('aria-expanded', 'false');
}

// ── Version list ──────────────────────────────────────────────
function _renderVersionList() {
  const current = getCurrentVersion();
  const submenu = document.getElementById('versionSubmenu');

  submenu.innerHTML = getAvailableVersions().map(v => {
    const isActive = v === current;
    const label    = v === LOCAL_VERSION ? 'Données locales' : v;
    return `<button class="menu-version-item${isActive ? ' active' : ''}" data-version="${v}">
      <span class="menu-check">${isActive ? '✓' : ''}</span>
      <span>${label}</span>
    </button>`;
  }).join('');
}

function _updateVersionLabel() {
  const current = getCurrentVersion();
  const label   = current === LOCAL_VERSION ? 'locale' : current;
  const el = document.getElementById('versionEntry')?.querySelector('.menu-entry-value');
  if (el) el.textContent = label;
}

// ── Events ────────────────────────────────────────────────────
function _bindEvents(onDataReloaded) {
  const btn      = document.getElementById('menuBtn');
  const dropdown = document.getElementById('menuDropdown');
  const entry    = document.getElementById('versionEntry');
  const submenu  = document.getElementById('versionSubmenu');

  // Toggle menu open/close
  btn.addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.contains('open') ? _closeMenu() : _openMenu();
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target) && e.target !== btn) _closeMenu();
  });

  // Prevent clicks inside dropdown from closing it
  dropdown.addEventListener('click', e => e.stopPropagation());

  // Toggle version submenu
  entry.addEventListener('click', () => {
    const isOpen = submenu.classList.contains('open');
    submenu.classList.toggle('open', !isOpen);
    entry.classList.toggle('active', !isOpen);
  });

  // Version selection
  submenu.addEventListener('click', async e => {
    const item = e.target.closest('.menu-version-item');
    if (!item) return;
    const version = item.dataset.version;
    if (version === getCurrentVersion()) { _closeMenu(); return; }
    await _switchVersion(version, onDataReloaded);
  });
}

async function _switchVersion(version, onDataReloaded) {
  const entry = document.getElementById('versionEntry');

  // Show loading state — disable interaction but keep menu visible
  entry.querySelector('.menu-entry-value').textContent = 'Chargement…';
  document.getElementById('menuDropdown').classList.add('loading');

  try {
    await loadData(version);
    initState();
    _closeMenu();          // removes 'loading' too
    _updateVersionLabel();
    onDataReloaded();
  } catch {
    // Show error briefly, then restore label and re-enable
    entry.querySelector('.menu-entry-value').textContent = 'Erreur';
    setTimeout(() => {
      document.getElementById('menuDropdown').classList.remove('loading');
      _updateVersionLabel();
    }, 2000);
  }
}

export function refreshMenuVersionLabel() { _updateVersionLabel(); }
