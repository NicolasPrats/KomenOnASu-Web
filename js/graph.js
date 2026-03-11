import { getActiveNodes, getElementIcons, getElements, state, yearToLabel } from './store.js';
import { selectNode } from './detail.js';

let dagLayoutCache = null;
export function resetDagLayout() { dagLayoutCache = null; }

const graphState = {
  hoveredId: null,
  offsetX: 0, offsetY: 0,
  dragging: false, dragX: 0, dragY: 0, dragOX: 0, dragOY: 0,
};

// Dimensions
const GR = {
  // Rectangle central (nœud sélectionné)
  RW: 210, RH: 80,
  // Cercles
  RC_BIG: 28,   // cercle direct voisin
  RC_SML: 18,   // cercle niveau 2
  // Layout
  COL_W: 80,    // largeur réservée par colonne de cercles (diamètre + gap)
  PAD_TOP: 40, PAD_SIDE: 30,
  GAP_Y: 22,    // gap vertical minimum entre cercles
};


// ── Calcul du layout — éventail angulaire ────────────────────
// Antérieurs (year ≤ sel) : éventail vers le haut, demi-cercle [90°..270°] côté haut
//   - le plus ancien à la verticale (270° = 12h), les suivants symétriques
// Postérieurs (year > sel) : éventail vers le bas, demi-cercle [270°..90°] côté bas
//   - le plus récent à la verticale (90° = 6h), les suivants symétriques
function buildDagLayout(canvasW, canvasH) {
  const allNodes = getActiveNodes();
  const allSeen = new Set(); const allUnique = [];
  allNodes.forEach(n => { if (!allSeen.has(n.id)) { allSeen.add(n.id); allUnique.push(n); }});
  if (!allUnique.length || !state.selectedNode) return null;

  const sel = allUnique.find(n => n.id === state.selectedNode.id);
  if (!sel) return null;

  const byId = Object.fromEntries(allUnique.map(n => [n.id, n]));

  // Voisins directs uniquement
  const neighborIds = new Set();
  (sel.relatesTo ?? []).forEach(tid => { if (byId[tid]) neighborIds.add(tid); });
  allUnique.forEach(n => { if ((n.relatesTo ?? []).includes(sel.id)) neighborIds.add(n.id); });

  // Arêtes sel ↔ voisins
  const edges = [];
  allUnique.forEach(n => {
    (n.relatesTo ?? []).forEach(tid => {
      if ((n.id === sel.id || neighborIds.has(n.id)) && (tid === sel.id || neighborIds.has(tid)) && byId[tid])
        edges.push({ from: n.id, to: tid });
    });
  });

  const cx = canvasW / 2;
  const cy = canvasH / 2;

  // Rayon de l'éventail — adapté au nombre de voisins
  const R = Math.min(canvasW, canvasH) * 0.34;

  // Groupe "avant" : trié du plus ancien au plus récent (index 0 = plus ancien = vertical)
  const before = [...neighborIds].map(id => byId[id])
    .filter(n => n.year <= sel.year)
    .sort((a, b) => a.year - b.year);  // plus ancien en premier → placé à la verticale

  // Groupe "après" : trié du plus récent au plus ancien (index 0 = plus récent = vertical)
  const after = [...neighborIds].map(id => byId[id])
    .filter(n => n.year > sel.year)
    .sort((a, b) => b.year - a.year);  // plus récent en premier → placé à la verticale

  // Fonction qui répartit un groupe en éventail
  // baseAngle = angle du 1er élément (en radians, 0 = droite, sens trigo)
  // spread = amplitude totale en radians du demi-éventail
  // Pour "avant" (haut) : centre = -π/2 (= 270°), éventail vers l'arrière
  // Pour "après" (bas) : centre = π/2 (= 90°), éventail vers l'avant
  function fanPositions(group, centerAngle, maxSpread) {
    const n = group.length;
    if (!n) return {};
    // Espacement angulaire entre éléments : maxSpread / (n-1) si n>1 sinon 0
    const step = n > 1 ? Math.min(maxSpread / (n - 1), Math.PI / 5) : 0;
    const totalAngle = step * (n - 1);
    const positions = {};
    group.forEach((node, i) => {
      // i=0 → centre (vertical), i=1 → +step, i=2 → −step, i=3 → +2step…
      const side = i % 2 === 0 ? Math.floor(i / 2) : -Math.ceil(i / 2);
      const angle = centerAngle + side * step;
      positions[node.id] = {
        node,
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
      };
    });
    return positions;
  }

  const positions = {
    ...fanPositions(before, -Math.PI / 2, Math.PI * 0.75),  // haut, éventail ±67°
    ...fanPositions(after,   Math.PI / 2, Math.PI * 0.75),  // bas,  éventail ±67°
    [sel.id]: { node: sel, x: cx, y: cy },
  };

  return { positions, edges };
}

function ensureDagLayout() {
  const canvas = document.getElementById('graphCanvas');
  if (!dagLayoutCache) dagLayoutCache = buildDagLayout(canvas.offsetWidth, canvas.offsetHeight);
}

// ── drawGraph principal ──────────────────────────────────────
export function drawGraph() {
  const canvas = document.getElementById('graphCanvas');
  const ctx    = canvas.getContext('2d');
  const dpr    = window.devicePixelRatio || 1;
  canvas.width  = canvas.offsetWidth  * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  const cx = W / 2, cy = H / 2;

  ctx.fillStyle = '#111210'; ctx.fillRect(0, 0, W, H);

  if (!state.selectedNode) { renderGraphEmptyState(); return; }
  hideGraphPicker();

  ensureDagLayout();
  if (!dagLayoutCache) return;

  const selectedId = state.selectedNode.id;
  const { positions, edges } = dagLayoutCache;

  ctx.save();
  ctx.translate(graphState.offsetX, graphState.offsetY);

  // ── Arêtes
  ctx.setLineDash([4, 3]);
  edges.forEach(({ from, to }) => {
    const a = positions[from], b = positions[to];
    if (!a || !b) return;
    const color = getElements()[a.node.element]?.color ?? '#555';
    drawEgoDagEdge(ctx, a, b, from === selectedId, to === selectedId, cx, color);
  });
  ctx.setLineDash([]);

  // ── Cercles (tous sauf sélectionné)
  Object.entries(positions).forEach(([id, p]) => {
    if (id === selectedId) return;
    drawEgoDagNode(ctx, p, false, graphState.hoveredId === id, cx, cy);
  });

  // ── Rectangle sélectionné (par dessus tout)
  if (positions[selectedId]) {
    drawEgoDagNode(ctx, positions[selectedId], true, false, cx, cy);
  }

  ctx.restore();
}

function drawEgoDagNode(ctx, p, isSelected, isHovered, cx, cy) {
  const { x, y, node } = p;
  const color = getElements()[node.element]?.color ?? '#888';

  if (isSelected) {
    // ── Grand rectangle central ──────────────────────────────
    const hw = GR.RW / 2, hh = GR.RH / 2;
    const rx = cx - hw, ry = y - hh;

    // Halo
    const grd = ctx.createRadialGradient(cx, y, 0, cx, y, hw * 1.5);
    grd.addColorStop(0, color + '22'); grd.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(cx, y, hw * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.fill();

    // Rectangle
    ctx.beginPath(); ctx.roundRect(rx, ry, GR.RW, GR.RH, 5);
    ctx.fillStyle = color + '18';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fill(); ctx.stroke();

    // Bande gauche
    ctx.beginPath(); ctx.roundRect(rx, ry, 5, GR.RH, [5, 0, 0, 5]);
    ctx.fillStyle = color; ctx.fill();

    // Icône
    drawSvgIcon(ctx, getElementIcons()[node.element] ?? '', color, rx + 20, y, 20);

    // Type
    ctx.fillStyle = color + 'cc';
    ctx.font = "bold 8px 'JetBrains Mono',monospace";
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText((getElements()[node.element]?.label ?? '').toUpperCase(), rx + 36, ry + 10);

    // Titre
    ctx.fillStyle = '#edeae2';
    ctx.font = "13px 'Playfair Display',Georgia,serif";
    ctx.textBaseline = 'top';
    wrapText(ctx, node.name, rx + 36, ry + 22, GR.RW - 46, 14, 2);

    // Année
    ctx.fillStyle = '#88ccf5';
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.textBaseline = 'bottom';
    ctx.fillText(yearToLabel(node.year), rx + 36, ry + GR.RH - 6);

  } else {
    // ── Cercle ───────────────────────────────────────────────
    const r = GR.RC_BIG;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color + (isHovered ? '55' : '22');
    ctx.strokeStyle = color + (isHovered ? 'ee' : '77');
    ctx.lineWidth = isHovered ? 2 : 1.5;
    ctx.fill(); ctx.stroke();

    // Icône dans le cercle
    drawSvgIcon(ctx, getElementIcons()[node.element] ?? '', color, x, y, r * 0.9);

    // Direction radiale vers l'extérieur depuis le centre du canvas
    const dx = x - cx, dy = y - cy;
    const dlen = Math.hypot(dx, dy) || 1;
    const ux = dx / dlen, uy = dy / dlen;

    // Label à r+5 dans la direction radiale
    const lx = x + ux * (r + 5);
    const ly = y + uy * (r + 5);

    // Alignement selon direction
    ctx.textAlign = ux > 0.3 ? 'left' : ux < -0.3 ? 'right' : 'center';
    ctx.textBaseline = uy > 0.3 ? 'top' : uy < -0.3 ? 'bottom' : 'middle';

    ctx.fillStyle = color + 'bb';
    ctx.font = "8px 'JetBrains Mono',monospace";
    ctx.fillText(yearToLabel(node.year), lx, ly);

    ctx.fillStyle = isHovered ? '#edeae2' : '#9a9890';
    ctx.font = "10px 'Crimson Pro',Georgia,serif";
    ctx.textBaseline = uy > 0.3 ? 'top' : uy < -0.3 ? 'bottom' : 'middle';
    wrapText(ctx, node.name, lx, ly + (uy > 0.3 ? 9 : uy < -0.3 ? -9 : -5), 110, 11, 2);
  }
}

function drawEgoDagEdge(ctx, fromPos, toPos, fromIsSelected, toIsSelected, cx, color) {
  // Centres effectifs
  const fx = fromIsSelected ? cx       : fromPos.x;
  const fy = fromIsSelected ? fromPos.y : fromPos.y;
  const tx = toIsSelected   ? cx       : toPos.x;
  const ty = toIsSelected   ? toPos.y  : toPos.y;

  // Direction de la ligne
  const dx = tx - fx, dy = ty - fy;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;

  // Point de départ : bord du rectangle ou du cercle
  let x1, y1, x2, y2;
  if (fromIsSelected) {
    // Bord du rectangle : on clip l'axe (ux,uy) sur le rectangle RW×RH
    const hw = GR.RW / 2, hh = GR.RH / 2;
    const tx0 = ux !== 0 ? hw / Math.abs(ux) : Infinity;
    const ty0 = uy !== 0 ? hh / Math.abs(uy) : Infinity;
    const t = Math.min(tx0, ty0);
    x1 = fx + ux * t; y1 = fy + uy * t;
  } else {
    x1 = fx + ux * GR.RC_BIG; y1 = fy + uy * GR.RC_BIG;
  }
  if (toIsSelected) {
    const hw = GR.RW / 2, hh = GR.RH / 2;
    const tx0 = ux !== 0 ? hw / Math.abs(ux) : Infinity;
    const ty0 = uy !== 0 ? hh / Math.abs(uy) : Infinity;
    const t = Math.min(tx0, ty0);
    x2 = tx - ux * t; y2 = ty - uy * t;
  } else {
    x2 = tx - ux * GR.RC_BIG; y2 = ty - uy * GR.RC_BIG;
  }

  // Ligne droite (éventail simple → pas besoin de Bézier)
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color + '55';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ── Hit test ────────────────────────────────────────────────
function hitTestDag(e) {
  if (!dagLayoutCache) return null;
  const canvas = document.getElementById('graphCanvas');
  const rect   = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left  - graphState.offsetX;
  const my = e.clientY - rect.top   - graphState.offsetY;
  const cx = canvas.offsetWidth / 2;
  const selectedId = state.selectedNode?.id;
  const positions  = dagLayoutCache.positions;

  for (const [id, p] of Object.entries(positions)) {
    if (id === selectedId) {
      if (mx >= cx - GR.RW/2 && mx <= cx + GR.RW/2 &&
          my >= p.y - GR.RH/2 && my <= p.y + GR.RH/2) return p.node;
    } else {
      if (Math.hypot(mx - p.x, my - p.y) < GR.RC_BIG + 4) return p.node;
    }
  }
  return null;
}

// ── UI liste vide ────────────────────────────────────────────
function renderGraphEmptyState() {
  const panel = document.getElementById('graphPanel');
  let picker = document.getElementById('graphNodePicker');
  if (!picker) {
    picker = document.createElement('div');
    picker.id = 'graphNodePicker';
    picker.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:1rem;
      pointer-events:auto;z-index:10;background:var(--bg);`;
    panel.appendChild(picker);
  }
  picker.style.display = 'flex';
  const nodes = getActiveNodes();
  const seen = new Set(); const unique = [];
  nodes.forEach(n => { if (!seen.has(n.id)) { seen.add(n.id); unique.push(n); }});
  unique.sort((a, b) => a.year - b.year);

  picker.innerHTML = `
    <div style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;letter-spacing:0.14em;color:var(--muted);text-transform:uppercase">
      Choisir un élément à explorer
    </div>
    <div style="display:flex;flex-direction:column;gap:0.3rem;max-height:70vh;overflow-y:auto;width:320px;">
      ${unique.map(n => {
        const color = getElements()[n.element]?.color ?? '#888';
        return `<div class="graph-pick-item" data-node-id="${n.id}" style="
          display:flex;align-items:center;gap:0.6rem;padding:0.4rem 0.75rem;border-radius:3px;
          background:var(--bg2);border:1px solid var(--border);cursor:pointer;transition:border-color 0.12s;">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <span style="font-family:'Playfair Display',serif;font-size:0.85rem;color:var(--paper);flex:1;line-height:1.25">${n.name}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.58rem;color:var(--muted)">${yearToLabel(n.year)}</span>
        </div>`;
      }).join('')}
    </div>`;

  picker.querySelectorAll('.graph-pick-item').forEach(item => {
    item.addEventListener('mouseenter', () => item.style.borderColor = 'var(--accent)');
    item.addEventListener('mouseleave', () => item.style.borderColor = 'var(--border)');
    item.addEventListener('click', () => {
      const node = unique.find(n => n.id === item.dataset.nodeId);
      if (node) { picker.style.display = 'none'; selectNode(node); }
    });
  });
}

function hideGraphPicker() {
  const el = document.getElementById('graphNodePicker');
  if (el) el.style.display = 'none';
}
export function initGraph() {
  const canvas  = document.getElementById('graphCanvas');
  const tooltip = document.getElementById('graphTooltip');

  canvas.addEventListener('mousedown', e => {
    graphState.dragging = true;
    graphState.dragX = e.clientX; graphState.dragY = e.clientY;
    graphState.dragOX = graphState.offsetX; graphState.dragOY = graphState.offsetY;
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mousemove', e => {
    if (graphState.dragging) {
      graphState.offsetX = graphState.dragOX + (e.clientX - graphState.dragX);
      graphState.offsetY = graphState.dragOY + (e.clientY - graphState.dragY);
      drawGraph(); return;
    }
    const hit = hitTestDag(e);
    graphState.hoveredId = hit?.id ?? null;
    if (hit) {
      tooltip.style.left = (e.offsetX + 16) + 'px';
      tooltip.style.top  = (e.offsetY + 12) + 'px';
      tooltip.innerHTML  = `<div class="tt-name">${hit.name}</div><div class="tt-year">${yearToLabel(hit.year)}</div><div class="tt-type">${getElements()[hit.element]?.label ?? ''}</div>`;
      tooltip.classList.add('visible');
    } else {
      tooltip.classList.remove('visible');
    }
    drawGraph();
  });

  canvas.addEventListener('mouseup', e => {
    const moved = Math.abs(e.clientX - graphState.dragX) > 4 || Math.abs(e.clientY - graphState.dragY) > 4;
    graphState.dragging = false; canvas.style.cursor = 'grab';
    if (!moved) { const hit = hitTestDag(e); if (hit) selectNode(hit); }
  });

  canvas.addEventListener('mouseleave', () => {
    graphState.dragging = false; graphState.hoveredId = null;
    tooltip.classList.remove('visible'); canvas.style.cursor = 'grab';
    drawGraph();
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    graphState.offsetY -= e.deltaY * 0.8;
    drawGraph();
  }, { passive: false });
}

function layoutGraph() {} // compat

export function syncGraphCenter(nodeId) {
  if (state.currentView !== 'graph') return;
  dagLayoutCache = null; // recalcul pour centrer sur la nouvelle sélection
  ensureDagLayout();
  if (dagLayoutCache?.positions[nodeId]) {
    const canvas = document.getElementById('graphCanvas');
    graphState.offsetY = canvas.offsetHeight / 2 - dagLayoutCache.positions[nodeId].y;
    graphState.offsetX = 0;
  }
  drawGraph();
}

// ── SVG icon cache ───────────────────────────────────────────
const _svgCache = {};
function drawSvgIcon(ctx, svgStr, color, cx, cy, size) {
  if (!svgStr) return;
  const colored = svgStr.replace(/currentColor/g, color);
  const key = colored + size;
  if (_svgCache[key] instanceof HTMLImageElement && _svgCache[key].complete) {
    ctx.drawImage(_svgCache[key], cx - size / 2, cy - size / 2, size, size);
    return;
  }
  if (_svgCache[key]) return;
  const blob = new Blob([colored], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const img  = new Image(); img.src = url;
  _svgCache[key] = img;
  img.onload = () => { URL.revokeObjectURL(url); drawGraph(); };
}

function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = text.split(' ');
  let line = '', lineCount = 0;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, y + lineCount * lineH);
      line = w; lineCount++;
      if (lineCount >= maxLines) { ctx.fillText(line + '…', x, y + lineCount * lineH); return; }
    } else line = t;
  }
  if (line) ctx.fillText(line, x, y + lineCount * lineH);
}

