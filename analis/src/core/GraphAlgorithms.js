/**
 * Алгоритмы анализа графов
 * BFS, Dijkstra, DFS (поиск циклов), PageRank
 */

class GraphAlgorithms {
  /**
   * BFS - Кратчайший путь в невзвешенном графе
   * @param {BehaviorGraph} graph - граф
   * @param {string} start - стартовый узел
   * @param {string} target - целевой узел
   * @returns {array} путь от start к target
   */
  static bfs(graph, start, target) {
    if (!graph.nodes.has(start) || !graph.nodes.has(target)) {
      return null;
    }

    const queue = [start];
    const visited = new Set([start]);
    const parent = new Map([[start, null]]);

    while (queue.length > 0) {
      const node = queue.shift();

      if (node === target) {
        // Перстроить путь
        const path = [];
        let current = target;
        while (current !== null) {
          path.unshift(current);
          current = parent.get(current);
        }
        return path;
      }

      // Найти все соседов
      graph.edges.forEach((edge) => {
        if (edge.source === node && !visited.has(edge.target)) {
          visited.add(edge.target);
          parent.set(edge.target, node);
          queue.push(edge.target);
        }
      });
    }

    return null; // пути нет
  }

  /**
   * Dijkstra - Наиболее вероятные маршруты в взвешенном графе
   * @param {BehaviorGraph} graph
   * @param {string} start
   * @returns {object} {расстояния, предъистори}
   */
  static dijkstra(graph, start) {
    if (!graph.nodes.has(start)) {
      return { distances: {}, previous: {} };
    }

    const distances = {};
    const previous = {};
    const unvisited = new Set();

    // Инициализация
    graph.nodes.forEach((node, id) => {
      distances[id] = id === start ? 0 : -Infinity;
      previous[id] = null;
      unvisited.add(id);
    });

    while (unvisited.size > 0) {
      // Найти узел с максимальным расстоянием
      let maxNode = null;
      let maxDist = -Infinity;

      unvisited.forEach((nodeId) => {
        if (distances[nodeId] > maxDist) {
          maxDist = distances[nodeId];
          maxNode = nodeId;
        }
      });

      if (maxNode === null || maxDist === -Infinity) break;

      unvisited.delete(maxNode);

      // Обновить расстояния для соседов
      graph.edges.forEach((edge) => {
        if (edge.source === maxNode && unvisited.has(edge.target)) {
          const logWeight = Math.log(edge.weight + 1);
          const newDist = distances[maxNode] + logWeight;
          
          if (newDist > distances[edge.target]) {
            distances[edge.target] = newDist;
            previous[edge.target] = maxNode;
          }
        }
      });
    }

    return { distances, previous };
  }

  /**
   * DFS - Поиск циклов в графе
   * @param {BehaviorGraph} graph
   * @returns {array} все найденные циклы
   */
  static dfs(graph) {
    const cycles = [];
    const visited = new Set();
    const recStack = new Set();

    const dfs = (nodeId, path) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      // Найти всех соседов
      graph.edges.forEach((edge) => {
        if (edge.source === nodeId) {
          const neighbor = edge.target;

          if (!visited.has(neighbor)) {
            dfs(neighbor, [...path]);
          } else if (recStack.has(neighbor)) {
            // Найден цикл
            const cycleStart = path.indexOf(neighbor);
            if (cycleStart !== -1) {
              const cycle = path.slice(cycleStart);
              // Не добавлять дубликаты
              if (!cycles.some(c => c.join('-') === cycle.join('-'))) {
                cycles.push(cycle);
              }
            }
          }
        }
      });

      recStack.delete(nodeId);
      path.pop();
    };

    const nodeIds = Array.from(graph.nodes.keys());
    nodeIds.forEach((nodeId) => {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    });

    return cycles;
  }

  /**
   * Получить кратчайшие пути между любыми двумя узлами (Floyd-Warshall)
   * @param {BehaviorGraph} graph
   * @returns {object} матрица расстояний
   */
  static floydWarshall(graph) {
    const nodeIds = Array.from(graph.nodes.keys());
    const n = nodeIds.length;
    const INF = Infinity;

    // Ойнициализировать матрицу
    const dist = Array(n).fill(0).map(() => Array(n).fill(INF));
    
    // Диагональ = 0
    nodeIds.forEach((_, i) => {
      dist[i][i] = 0;
    });

    // Обновить ребрами
    graph.edges.forEach((edge) => {
      const i = nodeIds.indexOf(edge.source);
      const j = nodeIds.indexOf(edge.target);
      if (i !== -1 && j !== -1) {
        dist[i][j] = 1; // для невзвешенных графов
      }
    });

    // Floyd-Warshall
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] + dist[k][j] < dist[i][j]) {
            dist[i][j] = dist[i][k] + dist[k][j];
          }
        }
      }
    }

    return dist;
  }

  /**
   * Обнаружить кластеры (connected components)
   * @param {BehaviorGraph} graph
   * @returns {array} арреий кластеров
   */
  static findClusters(graph) {
    const visited = new Set();
    const clusters = [];

    const dfs = (nodeId, cluster) => {
      visited.add(nodeId);
      cluster.push(nodeId);

      graph.edges.forEach((edge) => {
        // Оба направления
        if ((edge.source === nodeId || edge.target === nodeId) && !visited.has(edge.target)) {
          dfs(edge.target, cluster);
        }
        if (edge.target === nodeId && !visited.has(edge.source)) {
          dfs(edge.source, cluster);
        }
      });
    };

    graph.nodes.forEach((node, nodeId) => {
      if (!visited.has(nodeId)) {
        const cluster = [];
        dfs(nodeId, cluster);
        clusters.push(cluster);
      }
    });

    return clusters;
  }

  /**
   * Вычислить центральность близкости для каждого узла
   * @param {BehaviorGraph} graph
   * @returns {object} closeness scores
   */
  static closeness(graph) {
    const nodeIds = Array.from(graph.nodes.keys());
    const distances = this.floydWarshall(graph);
    const closeness = {};

    nodeIds.forEach((nodeId, i) => {
      let totalDist = 0;
      let reachable = 0;

      nodeIds.forEach((_, j) => {
        if (i !== j && distances[i][j] !== Infinity) {
          totalDist += distances[i][j];
          reachable++;
        }
      });

      closeness[nodeId] = reachable > 0 ? (reachable - 1) / totalDist : 0;
    });

    return closeness;
  }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphAlgorithms;
}
