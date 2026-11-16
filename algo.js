// Pure pathfinding algorithms — no DOM, so node can test them.
// grid: { rows, cols, walls: Set of "r,c" }
function neighbors(grid, r, c) {
  const out = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < grid.rows && nc >= 0 && nc < grid.cols && !grid.walls.has(nr + ',' + nc)) out.push([nr, nc]);
  }
  return out;
}

function bfs(grid, start, goal) {
  const key = (p) => p[0] + ',' + p[1];
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

function buildPath(prev, goal) {
  const k = goal[0] + ',' + goal[1];
  if (!prev.has(k)) return [];
  const path = [];
  for (let p = goal; p; p = prev.get(p[0] + ',' + p[1])) path.unshift(p);
  return path;
}

if (typeof module !== 'undefined') module.exports = { bfs, neighbors };
