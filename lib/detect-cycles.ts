type Edge = {
  sourceFileId: string;
  targetFileId: string;
};

export function findCircularEdges(edges: Edge[]) {
  // sourceFileId → targetFileIds
  const graph = new Map<string, string[]>();

  for (const edge of edges) {
    if (!graph.has(edge.sourceFileId)) {
      graph.set(edge.sourceFileId, []);
    }

    graph.get(edge.sourceFileId)!.push(
      edge.targetFileId
    );
  }

  // Nodes currently in the DFS path
  const visiting = new Set<string>();

  // Nodes we have completely processed
  const visited = new Set<string>();

  // Edges that create a cycle
  const circularEdges = new Set<string>();

  function dfs(node: string) {
    visiting.add(node);

    const neighbours = graph.get(node) ?? [];

    for (const neighbour of neighbours) {
      // We found a node already in the current path
      if (visiting.has(neighbour)) {
        circularEdges.add(
          `${node}->${neighbour}`
        );

        continue;
      }

      // Already completely processed
      if (visited.has(neighbour)) {
        continue;
      }

      dfs(neighbour);
    }

    visiting.delete(node);
    visited.add(node);
  }

  // Start DFS from every unvisited node
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return circularEdges;
}