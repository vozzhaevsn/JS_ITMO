/**
 * BehaviorGraph - Основной класс для управления графом поведения пользователя
 * Поддерживает операции: добавление узлов/ребер, вычисление метрик, экспорт
 */
class BehaviorGraph {
  constructor(config = {}) {
    this.nodes = new Map();      // id → node object
    this.edges = new Map();      // "u→v" → edge object
    this.sessions = [];          // Массив сессий
    this.cycles = [];            // Найденные циклы
    this.config = {
      maxNodes: 10000,
      maxSessions: 1000,
      sessionTimeout: 30 * 60 * 1000, // 30 мин
      enableWeighting: true,
      weightAlpha: 0.5,    // для логирования частоты
      weightBeta: 0.3,     // для среднего времени
      weightGamma: 0.2,    // для recency
      ...config
    };
  }

  /**
   * Добавить узел в граф
   * @param {string} id - Уникальный идентификатор
   * @param {object} properties - Свойства узла
   */
  addNode(id, properties = {}) {
    if (this.nodes.size >= this.config.maxNodes) {
      console.warn('[BehaviorGraph] Граф достиг максимума узлов:', this.config.maxNodes);
      return;
    }

    if (!this.nodes.has(id)) {
      this.nodes.set(id, {
        id,
        label: properties.label || id,
        type: properties.type || 'element',
        visits: 1,
        timeSpent: 0,
        avgTimePerVisit: 0,
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        inDegree: 0,
        outDegree: 0,
        closeness: 0,
        betweenness: 0,
        pageRank: 0,
        clusteringCoeff: 0,
        ...properties
      });
    } else {
      const node = this.nodes.get(id);
      node.visits++;
      node.lastVisit = Date.now();
      if (properties.timeSpent) {
        node.timeSpent += properties.timeSpent;
        node.avgTimePerVisit = node.timeSpent / node.visits;
      }
    }
  }

  /**
   * Добавить ребро (переход) между узлами
   */
  addEdge(sourceId, targetId, weight = 1, metadata = {}) {
    if (!this.nodes.has(sourceId)) this.addNode(sourceId);
    if (!this.nodes.has(targetId)) this.addNode(targetId);

    const edgeKey = `${sourceId}→${targetId}`;

    if (this.edges.has(edgeKey)) {
      const edge = this.edges.get(edgeKey);
      edge.count++;
      edge.weight += weight;
      edge.lastOccurrence = Date.now();
    } else {
      this.edges.set(edgeKey, {
        source: sourceId,
        target: targetId,
        weight,
        count: 1,
        firstOccurrence: Date.now(),
        lastOccurrence: Date.now(),
        avgDuration: metadata.duration || 0,
        ...metadata
      });
    }

    this.nodes.get(sourceId).outDegree++;
    this.nodes.get(targetId).inDegree++;
  }

  /**
   * Получить матрицу смежности (для алгоритмов)
   */
  getAdjacencyMatrix() {
    const nodeIds = Array.from(this.nodes.keys());
    const n = nodeIds.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

    this.edges.forEach((edge) => {
      const i = nodeIds.indexOf(edge.source);
      const j = nodeIds.indexOf(edge.target);
      if (i !== -1 && j !== -1) {
        matrix[i][j] = this.config.enableWeighting ? edge.weight : 1;
      }
    });

    return { matrix, nodeIds };
  }

  /**
   * Вычислить все метрики графа
   */
  computeAllMetrics() {
    const startTime = performance.now();
    
    this.computePageRank();
    this.computeCentrality();
    this.detectCycles();
    
    const endTime = performance.now();
    console.log(`[BehaviorGraph] Метрики вычислены за ${(endTime - startTime).toFixed(2)}ms`);
    
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      cycleCount: this.cycles.length,
      computeTime: endTime - startTime
    };
  }

  /**
   * Вычислить PageRank для всех узлов
   */
  computePageRank(damping = 0.85, iterations = 20) {
    const n = this.nodes.size;
    const rank = new Map();
    const nodeIds = Array.from(this.nodes.keys());

    nodeIds.forEach((id) => {
      rank.set(id, 1 / n);
    });

    for (let i = 0; i < iterations; i++) {
      const newRank = new Map();

      nodeIds.forEach((node) => {
        let sum = 0;

        this.edges.forEach((edge) => {
          if (edge.target === node) {
            const sourceNode = this.nodes.get(edge.source);
            const sourceOutDegree = sourceNode.outDegree || 1;
            sum += rank.get(edge.source) / sourceOutDegree;
          }
        });

        newRank.set(node, (1 - damping) / n + damping * sum);
      });

      newRank.forEach((value, key) => {
        this.nodes.get(key).pageRank = value;
      });
    }

    return rank;
  }

  /**
   * Вычислить центральность узлов
   */
  computeCentrality() {
    this.nodes.forEach((node) => {
      let sumDistances = 0;
      let reachableCount = 0;

      this.nodes.forEach((otherNode) => {
        if (node.id !== otherNode.id) {
          const distance = this._getShortestPath(node.id, otherNode.id);
          if (distance !== Infinity) {
            sumDistances += distance;
            reachableCount++;
          }
        }
      });

      node.closeness = reachableCount > 0 ? reachableCount / sumDistances : 0;
    });
  }

  /**
   * BFS - кратчайший путь
   */
  _getShortestPath(startId, targetId) {
    if (startId === targetId) return 0;

    const queue = [[startId, 0]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const [currentId, distance] = queue.shift();

      if (currentId === targetId) return distance;

      this.edges.forEach((edge) => {
        if (edge.source === currentId && !visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push([edge.target, distance + 1]);
        }
      });
    }

    return Infinity;
  }

  /**
   * Обнаружить циклы в графе (DFS)
   */
  detectCycles() {
    const cycles = [];
    const visited = new Set();
    const recStack = new Set();

    const dfs = (nodeId, path) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path = [...path, nodeId];

      this.edges.forEach((edge) => {
        if (edge.source === nodeId) {
          const targetId = edge.target;

          if (!visited.has(targetId)) {
            dfs(targetId, path);
          } else if (recStack.has(targetId)) {
            const cycleStart = path.indexOf(targetId);
            const cycle = path.slice(cycleStart);
            if (!cycles.some(c => c.length === cycle.length && c.every((v, i) => v === cycle[i]))) {
              cycles.push(cycle);
            }
          }
        }
      });

      recStack.delete(nodeId);
    };

    this.nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });

    this.cycles = cycles;
    return cycles;
  }

  /**
   * Экспорт в JSON
   */
  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      cycles: this.cycles || [],
      metadata: {
        created: new Date().toISOString(),
        nodeCount: this.nodes.size,
        edgeCount: this.edges.size,
        cycleCount: this.cycles.length,
        sessionCount: this.sessions.length
      }
    };
  }

  /**
   * Импорт из JSON
   */
  fromJSON(data) {
    this.nodes.clear();
    this.edges.clear();

    data.nodes.forEach((node) => {
      this.nodes.set(node.id, node);
    });

    data.edges.forEach((edge) => {
      this.edges.set(`${edge.source}→${edge.target}`, edge);
    });

    this.cycles = data.cycles || [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BehaviorGraph;
}
