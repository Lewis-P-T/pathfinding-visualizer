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

const ALGORITHMS = { bfs: { name: 'BFS', fn: bfs }, dijkstra: { name: 'Dijkstra', fn: dijkstra }, astar: { name: 'A*', fn: astar } };

if (typeof module !== 'undefined') module.exports = { bfs, dijkstra, astar, neighbors, pathCost, MinHeap, ALGORITHMS };
