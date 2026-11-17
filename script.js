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

// --- Generators --------------------------------------------------------
// Mazes keep rooms on even coordinates, so snap start/goal onto one.
const toRoom = (p) => [p[0] - (p[0] % 2), p[1] - (p[1] % 2)];
document.getElementById('maze').addEventListener('click', () => {
  stopAnim();
  grid.walls = generateMaze(ROWS, COLS);
  grid.weights.clear();
  start = toRoom(start); goal = toRoom(goal);
  if (same(start, goal[0], goal[1])) goal = toRoom([ROWS - 1, COLS - 1]);
  render(); statsEl.textContent = 'Maze generated (recursive backtracker).';
});
document.getElementById('random').addEventListener('click', () => {
  stopAnim();
  grid.walls.clear(); grid.weights.clear();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (same(start, r, c) || same(goal, r, c)) continue;
    const x = Math.random();
    if (x < 0.25) grid.walls.add(r + ',' + c); else if (x < 0.33) grid.weights.set(r + ',' + c, MUD);
  }
  render(); statsEl.textContent = 'Random walls and mud placed.';
});

// --- Save / load -------------------------------------------------------
const STORE = 'pathfinder-maps';
const nameEl = document.getElementById('map-name');
const savedEl = document.getElementById('saved');
function readMaps() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function writeMaps(maps) { try { localStorage.setItem(STORE, JSON.stringify(maps)); } catch { statsEl.textContent = 'Could not save (storage unavailable).'; } }
function refreshSaved() {
  const names = Object.keys(readMaps()).sort();
  savedEl.replaceChildren(...names.map((n) => new Option(n, n)));
  if (!names.length) savedEl.append(new Option('(no saved maps)', ''));
}
function applyMap(obj) {
  const m = mapFromJSON(obj, ROWS, COLS);
  stopAnim();
  grid.walls = m.grid.walls; grid.weights = m.grid.weights;
  start = m.start; goal = m.goal;
  render();
}

document.getElementById('save').addEventListener('click', () => {
  const name = nameEl.value.trim() || savedEl.value;
  if (!name) { statsEl.textContent = 'Enter a map name first.'; return; }
  const maps = readMaps();
  maps[name] = mapToJSON(grid, start, goal);
  writeMaps(maps); refreshSaved(); savedEl.value = name;
  statsEl.textContent = `Saved "${name}".`;
});
document.getElementById('load').addEventListener('click', () => {
  const name = savedEl.value, m = readMaps()[name];
  if (!m) return;
  try { applyMap(m); nameEl.value = name; statsEl.textContent = `Loaded "${name}".`; }
  catch (err) { statsEl.textContent = `Saved map is invalid: ${err.message}`; }
});
document.getElementById('delete').addEventListener('click', () => {
  const name = savedEl.value, maps = readMaps();
  if (!(name in maps) || !confirm(`Delete map "${name}"?`)) return;
  delete maps[name]; writeMaps(maps); refreshSaved();
  statsEl.textContent = `Deleted "${name}".`;
});
document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(mapToJSON(grid, start, goal))], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (nameEl.value.trim() || 'map').replace(/[^\w-]+/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try { applyMap(JSON.parse(await file.text())); nameEl.value = file.name.replace(/\.json$/i, ''); statsEl.textContent = `Imported ${file.name}.`; }
  catch (err) { statsEl.textContent = `Import failed: ${err.message}`; }
});

refreshSaved();
render();
