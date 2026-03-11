import { getActiveNodes, getActiveScientists, getElementIcons, getElements, getScientists, state, yearToLabel } from './store.js';
import { selectNode, selectScientist } from './detail.js';

export const TL = {
  TOP_PAD:   44,
  BOT_PAD:   80,
  COL_W:     250,
  MIN_GAP:   4,
  CARD_H:    24,
  PX_PER_YR: 1.6,
  AXIS_X:    195,  // px left of axis line / dots
  CARD_X:    222,  // px left of column 0 cards
  SCI_X:     112,  // px left of scientist bars zone
};

function computeTimelineGeometry(years) {
  const minYear = Math.min(...years), maxYear = Math.max(...years);
  const range = maxYear - minYear || 1;
  const SPAN  = Math.max(620 - TL.TOP_PAD - TL.BOT_PAD, Math.round(range * TL.PX_PER_YR));
  const HEIGHT = SPAN + TL.TOP_PAD + TL.BOT_PAD;
  const yearToY = y => TL.TOP_PAD + ((y - minYear) / range) * SPAN;
  return { minYear, maxYear, range, SPAN, HEIGHT, yearToY };
}

function computeColumnLayout(sorted, yearToY) {
  const nextFreeY  = [TL.TOP_PAD];
  const colNextY   = {};
  const colAssigned = {};
  sorted.forEach(node => {
    const idealY = yearToY(node.year);
    let chosen = nextFreeY.findIndex(free => idealY >= free);
    if (chosen === -1) {
      chosen = nextFreeY.length;
      nextFreeY.push(TL.TOP_PAD);
    }
    colAssigned[node.id] = chosen;
    colNextY[chosen] = colNextY[chosen] ?? TL.TOP_PAD;
    const actualY = Math.max(idealY, colNextY[chosen]);
    nextFreeY[chosen] = colNextY[chosen] = actualY + TL.CARD_H + TL.MIN_GAP;
  });
  return colAssigned;
}

function renderAxisAndBands(container, geo) {
  const { minYear, maxYear, HEIGHT, yearToY } = geo;
  const axisLine = document.createElement('div');
  axisLine.className = 'time-axis';
  container.appendChild(axisLine);

  const centuryFloor = yr => Math.floor(yr / 100) * 100;
  const centuryCeil  = yr => Math.ceil(yr / 100) * 100;
  for (let c = centuryFloor(minYear); c < centuryCeil(maxYear); c += 100) {
    const yTop = Math.max(yearToY(c), 0);
    const yBot = Math.min(yearToY(c + 100), HEIGHT);
    if (yBot <= yTop) continue;
    const band = document.createElement('div');
    band.className = 'century-band ' + ((c / 100) % 2 === 0 ? 'even' : 'odd');
    band.style.top = yTop + 'px'; band.style.height = (yBot - yTop) + 'px';
    container.insertBefore(band, container.firstChild);
  }

  for (let yr = Math.ceil(minYear / 50) * 50; yr <= maxYear; yr += 50) {
    const y = yearToY(yr);
    const isCentury = yr % 100 === 0;
    const line = document.createElement('div');
    line.className = 'tick-line';
    line.style.top = y + 'px';
    line.style.opacity = isCentury ? '0.5' : '0.2';
    container.appendChild(line);
    const lbl = document.createElement('div');
    lbl.className = 'tick-label' + (isCentury ? ' century' : '');
    lbl.style.top = y + 'px';
    lbl.textContent = yearToLabel(yr);
    container.appendChild(lbl);
  }
}

function renderNodes(container, sorted, colAssigned, yearToY) {
  const colCursor = {};
  sorted.forEach((node, i) => {
    const idealY = yearToY(node.year);
    const col    = colAssigned[node.id] ?? 0;
    colCursor[col] = colCursor[col] ?? TL.TOP_PAD;
    const topY = Math.max(idealY, colCursor[col]);
    colCursor[col] = topY + TL.CARD_H + TL.MIN_GAP;

    const dimmed = state.hiddenElements.has(node.element);
    const elInfo = getElements()[node.element] ?? { color:'#888', label:node.element };
    const icon   = getElementIcons()[node.element] ?? '';

    const dotWrap = document.createElement('div');
    dotWrap.className = 'node-dot-wrap';
    dotWrap.dataset.nodeId = node.id;
    dotWrap.style.top = (idealY - 7) + 'px';
    dotWrap.innerHTML = `
      <div class="node-dot" style="background:${elInfo.color}"></div>
      <div class="dot-tooltip">
        <span class="dot-tooltip-name">${node.name}</span>
        <span class="dot-tooltip-year">${yearToLabel(node.year)}</span>
      </div>`;
    container.appendChild(dotWrap);

    const raw = node.excerpt ?? node.description ?? '';
    const excerptShort = raw.length > 150 ? raw.slice(0, 150).trimEnd() + '…' : raw;

    const nodeEl = document.createElement('div');
    nodeEl.className = 'node' + (state.selectedNode?.id === node.id ? ' selected' : '');
    nodeEl.style.cssText = `top:${topY}px;left:${TL.CARD_X + col * TL.COL_W}px;animation-delay:${i*0.03}s`;
    nodeEl.dataset.id = node.id;
    nodeEl.innerHTML = `
      <div class="node-card${dimmed?' dimmed':''}" style="border-left-color:${elInfo.color}">
        <span class="node-icon" style="color:${elInfo.color}">${icon}</span>
        <span class="node-name">${node.name}</span>
      </div>
      <div class="card-tooltip">
        <div class="card-tooltip-date">${yearToLabel(node.year)}${node.author ? ' · ' + node.author : ''}</div>
        <div class="card-tooltip-excerpt">${excerptShort}</div>
      </div>`;
    nodeEl.addEventListener('click', () => selectNode(node));
    container.appendChild(nodeEl);
  });
}

function setupTimelineHover(container) {
  function applyHover(activeId) {
    container.querySelectorAll('.node, .node-dot-wrap').forEach(el => {
      el.classList.toggle('hover-dim', (el.dataset.id ?? el.dataset.nodeId) !== activeId);
    });
    document.querySelectorAll('#connections-svg path[data-from]').forEach(p => {
      p.style.opacity = (p.dataset.from === activeId || p.dataset.to === activeId) ? '1' : '0.06';
    });
  }
  function clearHover() {
    container.querySelectorAll('.node, .node-dot-wrap').forEach(el => el.classList.remove('hover-dim'));
    document.querySelectorAll('#connections-svg path[data-from]').forEach(p => p.style.opacity = '');
  }
  container.querySelectorAll('.node-dot-wrap').forEach(el => {
    el.addEventListener('mouseenter', () => applyHover(el.dataset.nodeId));
    el.addEventListener('mouseleave', clearHover);
  });
  container.querySelectorAll('.node').forEach(el => {
    el.addEventListener('mouseenter', () => applyHover(el.dataset.id));
    el.addEventListener('mouseleave', clearHover);
  });
}

export function renderTimeline() {
  const container = document.getElementById('timelineContainer');
  container.querySelectorAll('.node,.node-dot-wrap,.era-label,.scientist-bar,.century-band,.tick-line,.tick-label,.axis-overlay').forEach(el => el.remove());

  const nodes = getActiveNodes();
  if (!nodes.length) return;

  const seen = new Set();
  const sorted = nodes
    .filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; })
    .sort((a, b) => a.year - b.year);

  const geo = computeTimelineGeometry(sorted.map(n => n.year));
  const { minYear, maxYear, SPAN, HEIGHT, yearToY } = geo;
  container.style.height = HEIGHT + 'px';

  const colAssigned = computeColumnLayout(sorted, yearToY);
  const nCols = Math.max(...Object.values(colAssigned)) + 1;
  const scrollWrap = document.querySelector('.timeline-scroll-wrap');
  if (scrollWrap) scrollWrap.style.minWidth = (TL.CARD_X + nCols * TL.COL_W + 40) + 'px';

  renderAxisAndBands(container, geo);
  renderNodes(container, sorted, colAssigned, yearToY);
  setupTimelineHover(container);

  const activeNodeIds = new Set(sorted.map(n => n.id));
  renderScientistBars(container, minYear, maxYear, HEIGHT, yearToY, activeNodeIds);
  requestAnimationFrame(() => drawConnections(sorted, container));
}

function renderScientistBars(container, minYear, maxYear, HEIGHT, yearToY, activeNodeIds) {
  const activeSciEntries = getActiveScientists(activeNodeIds);
  if (!activeSciEntries.length) return;

  const MARGIN   = 50;
  const BAR_W    = 14;
  const BAR_GAP  = 4;
  const SLOT_W   = BAR_W + BAR_GAP;

  const items = activeSciEntries.map(([sciId, sci]) => {
    const bornY  = sci.born;
    const diedY  = sci.died ?? maxYear;
    const topPx  = yearToY(Math.max(bornY, minYear));
    const botPx  = yearToY(Math.min(diedY, maxYear));
    return { sciId, sci, bornY, diedY, topPx, barH: Math.max(botPx - topPx, 8) };
  }).filter(it => it.bornY <= maxYear && it.diedY >= minYear);

  // Greedily assigner chaque scientifique à la première colonne libre
  // "libre" = sa dernière barre se termine plus de MARGIN ans avant ce scientifique
  const columns = []; // chaque colonne = { lastDiedYear }

  items.forEach(it => {
    let assigned = -1;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c].lastDiedYear + MARGIN <= it.bornY) {
        assigned = c;
        columns[c].lastDiedYear = it.diedY;
        break;
      }
    }
    if (assigned === -1) {
      assigned = columns.length;
      columns.push({ lastDiedYear: it.diedY });
    }
    it.col = assigned;
  });

  // ── Rendu ────────────────────────────────────────────────────
  items.forEach(it => {
    const { sciId, sci, topPx, barH, col } = it;
    const leftPx = TL.SCI_X + col * SLOT_W;

    const barEl = document.createElement('div');
    barEl.className = 'scientist-bar' + (state.selectedSci === sciId ? ' selected-sci' : '');
    barEl.dataset.sciId = sciId;
    barEl.style.cssText = `
      left:${leftPx}px;
      top:${topPx}px;
      height:${barH}px;
      --bar-h:${barH}px;
      background:${sci.color}55;
      border-left:2px solid ${sci.color};
      border-right:1px solid ${sci.color}44;
    `;

    // Abréviation du nom : prénom initial + nom de famille
    const parts = sci.name.split(' ');
    const lastName = parts[parts.length - 1];
    const firstInit = parts[0][0] + '.';
    const shortName = parts.length > 1 ? `${firstInit} ${lastName}` : sci.name;

    barEl.innerHTML = `
      <div class="scientist-birth-tick" style="background:${sci.color}"></div>
      <div class="scientist-death-tick" style="background:${sci.color}"></div>
      <span class="scientist-bar-name" style="--bar-h:${barH}px">${shortName}</span>
      <span class="scientist-bar-tooltip">${sci.name}</span>
    `;
    barEl.addEventListener('click', e => { e.stopPropagation(); selectScientist(sciId); });
    container.appendChild(barEl);
  });
}

function drawConnections(nodes, container) {
  const svg = document.getElementById('connections-svg');
  svg.innerHTML = '';
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  svg.appendChild(defs);

  const elMap = {};
  container.querySelectorAll('.node').forEach(el => { elMap[el.dataset.id] = el; });
  const contRect = container.getBoundingClientRect();
  const activeIds = new Set(nodes.map(n => n.id));

  nodes.forEach(node => {
    (node.relatesTo ?? []).forEach(targetId => {
      if (!activeIds.has(targetId)) return;
      const fE = elMap[node.id], tE = elMap[targetId];
      if (!fE || !tE) return;
      const fR = fE.getBoundingClientRect(), tR = tE.getBoundingClientRect();
      const x1 = fR.left - contRect.left + fR.width/2;
      const y1 = fR.top  - contRect.top  + fR.height/2;
      const x2 = tR.left - contRect.left + tR.width/2;
      const y2 = tR.top  - contRect.top  + tR.height/2;
      const dist = Math.hypot(x2-x1, y2-y1);
      const color = getElements()[node.element]?.color ?? '#555';
      const opacity = dist < 80 ? 0.55 : dist < 180 ? 0.38 : 0.22;
      const weight  = dist < 80 ? 1.8  : 1.2;
      const bow = (Math.abs(x1-x2) < 10) ? 28 : 0;
      const mx = (x1+x2)/2;

      const markerId = `arr-${node.id}-${targetId}`;
      const marker = document.createElementNS('http://www.w3.org/2000/svg','marker');
      marker.setAttribute('id', markerId);
      marker.setAttribute('markerWidth','6'); marker.setAttribute('markerHeight','6');
      marker.setAttribute('refX','5'); marker.setAttribute('refY','3');
      marker.setAttribute('orient','auto');
      const arrow = document.createElementNS('http://www.w3.org/2000/svg','path');
      arrow.setAttribute('d','M0,0 L0,6 L6,3 z');
      arrow.setAttribute('fill', color);
      arrow.setAttribute('opacity', Math.min(1, opacity+0.2));
      marker.appendChild(arrow);
      defs.appendChild(marker);

      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d', `M${x1},${y1} C${mx+bow},${y1} ${mx+bow},${y2} ${x2},${y2}`);
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', weight);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-opacity', opacity);
      path.setAttribute('stroke-dasharray', dist < 80 ? '3 2' : '5 3');
      path.setAttribute('marker-end', `url(#${markerId})`);
      path.setAttribute('data-from', node.id);
      path.setAttribute('data-to', targetId);
      svg.appendChild(path);
    });
  });
}

