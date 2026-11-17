const ROWS = 20, COLS = 40;
const MUD = 5; // cost to enter a mud cell (normal cells cost 1)
const grid = { rows: ROWS, cols: COLS, walls: new Set(), weights: new Map() };
let start = [10, 5], goal = [10, 34];
const gridEl = document.getElementById('grid');
const statsEl = document.getElementById('stats');
const speedEl = document.getElementById('speed');
const algoEl = document.getElementById('algo');
const cells = [];

gridEl.style.gridTemplateColumns = `repeat(${COLS}, minmax(0, 1fr))`;
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.dataset.r = r; el.dataset.c = c;
    gridEl.appendChild(el);
    cells.push(el);
  }
}
const cellAt = (r, c) => cells[r * COLS + c];
const same = (a, r, c) => a[0] === r && a[1] === c;

// Redraws base state (walls, start, goal) and wipes any visited/path overlay.
function render() {
  cells.forEach((el) => {
    const r = +el.dataset.r, c = +el.dataset.c;
    const k = r + ',' + c;
    el.className = 'cell' + (grid.walls.has(k) ? ' wall' : grid.weights.has(k) ? ' mud' : '');
    if (same(start, r, c)) el.classList.add('start');
    if (same(goal, r, c)) el.classList.add('goal');
  });
}

// --- Animation ---------------------------------------------------------
let animTimer = null;
function stopAnim() { clearTimeout(animTimer); animTimer = null; }

// Speed slider 1..10 -> ms between frames, plus cells painted per frame at top speeds.
function frameTiming() {
  const s = +speedEl.value;
  return { delay: Math.round(200 / s ** 1.6), batch: s >= 9 ? (s - 7) * 4 : 1 };
}

function mark(p, cls) {
  if (same(start, p[0], p[1]) || same(goal, p[0], p[1])) return;
  cellAt(p[0], p[1]).classList.add(cls);
}

function animate(visited, path, done) {
  const steps = [...visited.map((p) => [p, 'visited']), ...path.map((p) => [p, 'path'])];
  let i = 0;
  (function tick() {
    const { delay, batch } = frameTiming();
    for (let n = 0; n < batch && i < steps.length; n++, i++) mark(...steps[i]);
    if (i < steps.length) animTimer = setTimeout(tick, delay);
    else { animTimer = null; done(); }
  })();
}

function run() {
  stopAnim();
  render();
  const algo = ALGORITHMS[algoEl.value];
  const t0 = performance.now();
  const { visited, path } = algo.fn(grid, start, goal);
  const ms = (performance.now() - t0).toFixed(2);
  statsEl.textContent = `${algo.name}: searching…`;
  animate(visited, path, () => {
    statsEl.textContent = path.length
      ? `${algo.name}: visited ${visited.length} cells · path ${path.length - 1} steps · cost ${pathCost(grid, path)} · ${ms} ms`
      : `${algo.name}: no path found (visited ${visited.length}) · ${ms} ms`;
  });
}

// --- Editing -----------------------------------------------------------
let drag = null; // 'wall' | 'erase' | 'start' | 'goal'
const tool = () => document.querySelector('input[name="tool"]:checked').value;

function edit(el) {
  const r = +el.dataset.r, c = +el.dataset.c, k = r + ',' + c;
  if (drag === 'start' || drag === 'goal') {
    const other = drag === 'start' ? goal : start;
    if (grid.walls.has(k) || same(other, r, c)) return;
    if (drag === 'start') start = [r, c]; else goal = [r, c];
  } else {
    if (same(start, r, c) || same(goal, r, c)) return;
    grid.walls.delete(k); grid.weights.delete(k);
    if (drag === 'wall') grid.walls.add(k);
    else if (drag === 'mud') grid.weights.set(k, MUD);
  }
  render();
}

gridEl.addEventListener('pointerdown', (e) => {
  const el = e.target;
  if (!el.dataset.r) return;
  el.releasePointerCapture?.(e.pointerId); // let touch drags fire pointerover on other cells
  stopAnim();
  const r = +el.dataset.r, c = +el.dataset.c;
  drag = same(start, r, c) ? 'start' : same(goal, r, c) ? 'goal' : tool();
  edit(el);
});
gridEl.addEventListener('pointerover', (e) => { if (drag && e.target.dataset.r) edit(e.target); });
window.addEventListener('pointerup', () => { drag = null; });

document.getElementById('run').addEventListener('click', run);
document.getElementById('clear-path').addEventListener('click', () => { stopAnim(); render(); statsEl.textContent = 'Path cleared.'; });
document.getElementById('clear-walls').addEventListener('click', () => { stopAnim(); grid.walls.clear(); grid.weights.clear(); render(); statsEl.textContent = 'Walls and mud cleared.'; });

render();
