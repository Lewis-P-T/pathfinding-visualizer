# Pathfinding Visualizer

Draw walls and mud on a grid and watch BFS, Dijkstra and A* find their way. Plain HTML/CSS/JS, no dependencies, no build step.

Live: https://lewis-p-t.github.io/pathfinding-visualizer/

Run locally: open `index.html` in a browser.

## Features
- **Draw**: walls (impassable), mud (cost 5), erase; drag the green start / red goal to move them.
- **Algorithms**: BFS (unweighted), Dijkstra and A* (Manhattan) using a binary-heap priority queue.
- **Animation**: visited cells then the final path, with a speed slider.
- **Stats**: visited count, path length, path cost, search time.
- **Compare all**: runs every algorithm on the same map and shows a results table (best values highlighted).
- **Generators**: recursive-backtracker maze, random walls + mud.
- **Maps**: save/load/delete named maps in localStorage; export/import as JSON.

## Files
- `algo.js` — pure algorithms (search, heap, maze, map (de)serialisation, compare). Works in Node via `require('./algo.js')`.
- `script.js` — grid UI, editing, animation, storage.
