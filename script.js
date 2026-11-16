const ROWS = 20, COLS = 40;
const grid = { rows: ROWS, cols: COLS, walls: new Set() };
let start = [10, 5], goal = [10, 34];
const gridEl = document.getElementById('grid');
const statsEl = document.getElementById('stats');
const speedEl = document.getElementById('speed');
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
    el.className = 'cell' + (grid.walls.has(r + ',' + c) ? ' wall' : '');
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
  const { visited, path } = bfs(grid, start, goal);
  statsEl.textContent = 'Searching…';
  animate(visited, path, () => {
    statsEl.textContent = path.length
      ? `Visited ${visited.length} cells — path length ${path.length - 1}`
      : `No path found (visited ${visited.length})`;
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
    drag === 'wall' ? grid.walls.add(k) : grid.walls.delete(k);
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
document.getElementById('clear-walls').addEventListener('click', () => { stopAnim(); grid.walls.clear(); render(); statsEl.textContent = 'Walls cleared.'; });

render();
