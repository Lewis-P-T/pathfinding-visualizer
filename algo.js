// Pure pathfinding algorithms — no DOM, so node can test them.
// grid: { rows, cols, walls: Set of "r,c", weights: Map "r,c" -> cost to enter (default 1) }
const key = (p) => p[0] + ',' + p[1];

function neighbors(grid, r, c) {
  const out = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < grid.rows && nc >= 0 && nc < grid.cols && !grid.walls.has(nr + ',' + nc)) out.push([nr, nc]);
  }
  return out;
}

const cost = (grid, p) => (grid.weights && grid.weights.get(key(p))) || 1;

// Path cost = sum of entry costs of every cell after the start.
function pathCost(grid, path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += cost(grid, path[i]);
  return total;
}

// Unweighted: ignores mud, so its path is shortest in steps, not in cost.
function bfs(grid, start, goal) {
  const prev = new Map([[key(start), null]]);
  const visited = [];
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    visited.push(cur);
    if (key(cur) === key(goal)) break;
    for (const n of neighbors(grid, cur[0], cur[1])) {
      if (!prev.has(key(n))) { prev.set(key(n), cur); queue.push(n); }
    }
  }
  return { visited, path: buildPath(prev, goal) };
}

// Binary min-heap of [priority, tiebreak, item]; tiebreak = insertion order keeps it stable.
class MinHeap {
  constructor() { this.a = []; this.n = 0; }
  get size() { return this.a.length; }
  less(i, j) { const x = this.a[i], y = this.a[j]; return x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]); }
  swap(i, j) { [this.a[i], this.a[j]] = [this.a[j], this.a[i]]; }
  push(priority, item) {
    this.a.push([priority, this.n++, item]);
    for (let i = this.a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p); i = p;
    }
  }
  pop() {
    const top = this.a[0], last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.a.length && this.less(l, m)) m = l;
        if (r < this.a.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top[2];
  }
}

// Dijkstra when h = 0, A* otherwise. Lazy deletion: stale heap entries are skipped.
function bestFirst(grid, start, goal, h) {
  const dist = new Map([[key(start), 0]]);
  const prev = new Map([[key(start), null]]);
  const done = new Set();
  const visited = [];
  const heap = new MinHeap();
  heap.push(h(start, goal), start);
  while (heap.size) {
    const cur = heap.pop(), k = key(cur);
    if (done.has(k)) continue;
    done.add(k);
    visited.push(cur);
    if (k === key(goal)) break;
    for (const n of neighbors(grid, cur[0], cur[1])) {
      const nk = key(n), d = dist.get(k) + cost(grid, n);
      if (!done.has(nk) && (!dist.has(nk) || d < dist.get(nk))) {
        dist.set(nk, d); prev.set(nk, cur);
        heap.push(d + h(n, goal), n);
      }
    }
  }
  return { visited, path: buildPath(prev, goal) };
}

// Manhattan is admissible because every step costs at least 1.
const manhattan = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const dijkstra = (grid, start, goal) => bestFirst(grid, start, goal, () => 0);
const astar = (grid, start, goal) => bestFirst(grid, start, goal, manhattan);

function buildPath(prev, goal) {
  if (!prev.has(key(goal))) return [];
  const path = [];
  for (let p = goal; p; p = prev.get(key(p))) path.unshift(p);
  return path;
}

// Recursive backtracker (iterative, explicit stack). Rooms sit on even coordinates;
// odd cells between two rooms are carved to connect them. Returns the wall Set.
function generateMaze(rows, cols, rand = Math.random) {
  const walls = new Set();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) walls.add(r + ',' + c);
  walls.delete('0,0');
  const stack = [[0, 0]];
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const opts = [[-2, 0], [2, 0], [0, -2], [0, 2]]
      .map(([dr, dc]) => [r + dr, c + dc, r + dr / 2, c + dc / 2])
      .filter(([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols && walls.has(nr + ',' + nc));
    if (!opts.length) { stack.pop(); continue; }
    const [nr, nc, mr, mc] = opts[Math.floor(rand() * opts.length)];
    walls.delete(mr + ',' + mc); walls.delete(nr + ',' + nc);
    stack.push([nr, nc]);
  }
  return walls;
}

// Map <-> plain JSON. fromJSON validates everything because imports are untrusted.
function mapToJSON(grid, start, goal) {
  return { rows: grid.rows, cols: grid.cols, start, goal, walls: [...grid.walls], mud: [...grid.weights] };
}

function mapFromJSON(obj, rows, cols) {
  const inBounds = (p) => Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[0] < rows && p[1] >= 0 && p[1] < cols;
  const parseKey = (k) => typeof k === 'string' && /^\d+,\d+$/.test(k) ? k.split(',').map(Number) : null;
  if (!obj || obj.rows !== rows || obj.cols !== cols) throw new Error(`map must be ${rows}x${cols}`);
  if (!inBounds(obj.start) || !inBounds(obj.goal)) throw new Error('bad start/goal');
  if (!Array.isArray(obj.walls) || !Array.isArray(obj.mud)) throw new Error('missing walls/mud');
  const walls = new Set(), weights = new Map();
  for (const k of obj.walls) { if (!inBounds(parseKey(k))) throw new Error('bad wall ' + k); walls.add(k); }
  for (const e of obj.mud) {
    if (!Array.isArray(e) || !inBounds(parseKey(e[0])) || !(Number.isFinite(e[1]) && e[1] >= 1)) throw new Error('bad mud entry');
    weights.set(e[0], e[1]);
  }
  walls.delete(key(obj.start)); walls.delete(key(obj.goal));
  return { grid: { rows, cols, walls, weights }, start: [obj.start[0], obj.start[1]], goal: [obj.goal[0], obj.goal[1]] };
}

const ALGORITHMS = { bfs: { name: 'BFS', fn: bfs }, dijkstra: { name: 'Dijkstra', fn: dijkstra }, astar: { name: 'A*', fn: astar } };

// Run every algorithm on the same map; null path stats mean unreachable.
function compareAll(grid, start, goal) {
  return Object.entries(ALGORITHMS).map(([id, a]) => {
    const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
    const { visited, path } = a.fn(grid, start, goal);
    const ms = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
    return { id, name: a.name, visited: visited.length, steps: path.length ? path.length - 1 : null, cost: path.length ? pathCost(grid, path) : null, ms };
  });
}

if (typeof module !== 'undefined') module.exports = { generateMaze, mapToJSON, mapFromJSON, bfs, dijkstra, astar, neighbors, pathCost, MinHeap, ALGORITHMS, compareAll };
