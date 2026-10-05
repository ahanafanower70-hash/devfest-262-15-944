/**
 * Custom Dijkstra Routing Engine
 * Exact Deterministic Tie-Breaking Rules (AI DevFest Section 3.3):
 * 1. Minimum total path cost
 * 2. Lexicographically smallest exit ID
 * 3. Lexicographically smallest node sequence path element-by-element
 */

export function comparePaths(pathA, pathB) {
  const minLen = Math.min(pathA.length, pathB.length);
  for (let i = 0; i < minLen; i++) {
    if (pathA[i] < pathB[i]) return -1;
    if (pathA[i] > pathB[i]) return 1;
  }
  return pathA.length - pathB.length;
}

export function computeOptimalRoute(nodes, edges, blockedNodes, blockedEdges, closedExits, startNodeId) {
  // Check if selected start node is blocked
  if (blockedNodes.has(startNodeId)) {
    return {
      status: 'BLOCKED_START',
      cost: 0,
      exit: null,
      path: [],
      alternative: null
    };
  }

  // Build adjacency list
  const adj = new Map();
  nodes.forEach(n => adj.set(n.id, []));

  edges.forEach(edge => {
    if (blockedEdges.has(edge.id)) return;
    const u = edge.from;
    const v = edge.to;

    // Skip if either endpoint is in blocked_nodes
    if (blockedNodes.has(u) || blockedNodes.has(v)) return;

    // Skip if either endpoint is in closed_exits
    if (closedExits.has(u) || closedExits.has(v)) return;

    adj.get(u).push({ neighbor: v, cost: edge.cost, edgeId: edge.id });
    adj.get(v).push({ neighbor: u, cost: edge.cost, edgeId: edge.id });
  });

  const dist = new Map();
  const bestPath = new Map();

  dist.set(startNodeId, 0);
  bestPath.set(startNodeId, [startNodeId]);

  const queue = [{ node: startNodeId, cost: 0, path: [startNodeId] }];

  while (queue.length > 0) {
    queue.sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost;
      return comparePaths(a.path, b.path);
    });

    const current = queue.shift();
    const u = current.node;
    const d = current.cost;
    const pathU = current.path;

    if (d > dist.get(u)) continue;
    if (d === dist.get(u) && comparePaths(pathU, bestPath.get(u)) > 0) continue;

    const neighbors = adj.get(u) || [];
    for (const edge of neighbors) {
      const v = edge.neighbor;
      const newCost = d + edge.cost;
      const newPath = [...pathU, v];

      const currentDistV = dist.has(v) ? dist.get(v) : Infinity;
      const currentPathV = bestPath.get(v);

      let update = false;
      if (newCost < currentDistV) {
        update = true;
      } else if (newCost === currentDistV) {
        if (currentPathV && comparePaths(newPath, currentPathV) < 0) {
          update = true;
        }
      }

      if (update) {
        dist.set(v, newCost);
        bestPath.set(v, newPath);
        queue.push({ node: v, cost: newCost, path: newPath });
      }
    }
  }

  // Reachable open exits
  const reachableExits = [];
  nodes.forEach(n => {
    if (n.type === 'exit' && !closedExits.has(n.id) && dist.has(n.id)) {
      reachableExits.push({
        id: n.id,
        cost: dist.get(n.id),
        path: bestPath.get(n.id)
      });
    }
  });

  if (reachableExits.length === 0) {
    return {
      status: 'NO_ROUTE',
      cost: 0,
      exit: null,
      path: [],
      alternative: null
    };
  }

  // Tie-breaking across exits
  reachableExits.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return comparePaths(a.path, b.path);
  });

  const winner = reachableExits[0];
  const alternative = reachableExits.length > 1 ? reachableExits[1] : null;

  return {
    status: 'SUCCESS',
    cost: winner.cost,
    exit: winner.id,
    path: winner.path,
    alternative: alternative
  };
}
