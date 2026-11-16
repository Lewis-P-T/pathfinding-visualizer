const ROWS = 20, COLS = 40;
const grid = { rows: ROWS, cols: COLS, walls: new Set() };
const start = [10, 5], goal = [10, 34];
const gridEl = document.getElementById('grid');
const statsEl = document.getElementById('stats');
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

function render() {
  cells.forEach((el) => {
    const r = +el.dataset.r, c = +el.dataset.c;
    el.className = 'cell' + (grid.walls.has(r + ',' + c) ? ' wall' : '');
    if (same(start, r, c)) el.classList.add('start');
    if (same(goal, r, c)) el.classList.add('goal');
  });
}

let drawing = false, drawMode = true;
function paint(el) {
  const r = +el.dataset.r, c = +el.dataset.c;
  if (same(start, r, c) || same(goal, r, c)) return;
  const k = r + ',' + c;
  drawMode ? grid.walls.add(k) : grid.walls.delete(k);
  render();
}
gridEl.addEventListener('pointerdown', (e) => {
  if (!e.target.dataset.r) return;
  drawing = true;
  drawMode = !grid.walls.has(e.target.dataset.r + ',' + e.target.dataset.c); // toggle based on first cell
  paint(e.target);
});
gridEl.addEventListener('pointerover', (e) => { if (drawing && e.target.dataset.r) paint(e.target); });
window.addEventListener('pointerup', () => { drawing = false; });

document.getElementById('run').addEventListener('click', () => {
  render();
  const { visited, path } = bfs(grid, start, goal);
  visited.forEach(([r, c]) => cellAt(r, c).classList.add('visited'));
  path.forEach(([r, c]) => cellAt(r, c).classList.add('path'));
  cellAt(...start).className = 'cell start';
  cellAt(...goal).className = 'cell goal';
  statsEl.textContent = path.length ? `Visited ${visited.length} cells — path length ${path.length - 1}` : `No path found (visited ${visited.length})`;
});

render();
