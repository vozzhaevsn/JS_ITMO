/**
 * Основной класс для управления графом поведения
 * Поддерживает операции: добавление узлов/ребер, 
 * вычисление метрик, экспорт
 */
class BehaviorGraph {
  constructor(config = {}) {
    this.nodes = new Map();      // id → node object
    this.edges = new Map();      // "u→v" → edge object
    this.sessions = [];          // Массив сессий
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
      console.warn('Граф достиг максимума узлов');
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
   * @param {string} sourceId 
   * @param {string} targetId 
   * @param {number} weight - Вес переходов (1+ = кратность)
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

    // Обновить in/out степени
    this.nodes.get(sourceId).outDegree++;
    this.nodes.get(targetId).inDegree++;
  }

  /**
   * Получить матрицу смежности (для алгоритмов)
   * @returns {object} { matrix, nodeIds }
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
   * Вычислить все метрики графа (BFS, PageRank, cycles)
   */
  computeAllMetrics() {
    const startTime = performance.now();
    
    this.computePageRank();
    this.computeCentrality();
    this.detectCycles();
    
    const endTime = performance.now();
    console.log(`[GraphAnalysis] Metrics computed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      computeTime: endTime - startTime
    };
  }

  /**
   * Вычислить PageRank для всех узлов
   */
  computePageRank(iterations = 20, dampingFactor = 0.85) {
    const nodeIds = Array.from(this.nodes.keys());
    const n = nodeIds.length;
    
    // Инициализация
    nodeIds.forEach(id => {
      this.nodes.get(id).pageRank = (1 - dampingFactor) / n;
    });

    // Итерации
    for (let iter = 0; iter < iterations; iter++) {
      const newRanks = {};
      
      nodeIds.forEach(id => {
        newRanks[id] = (1 - dampingFactor) / n;
      });

      this.edges.forEach((edge) => {
        const sourceNode = this.nodes.get(edge.source);
        const outDegree = sourceNode.outDegree || 1;
        const contribution = (sourceNode.pageRank / outDegree) * dampingFactor;
        newRanks[edge.target] = (newRanks[edge.target] || 0) + contribution;
      });

      nodeIds.forEach(id => {
        this.nodes.get(id).pageRank = newRanks[id];
      });
    }
  }

  /**
   * Вычислить центральность узлов (closeness, betweenness)
   */
  computeCentrality() {
    const nodeIds = Array.from(this.nodes.keys());
    const n = nodeIds.length;

    nodeIds.forEach(nodeId => {
      const node = this.nodes.get(nodeId);
      
      // In-degree и Out-degree уже вычислены
      // Здесь можно добавить более сложные метрики при необходимости
    });
  }

  /**
   * Найти все циклы в графе
   */
  detectCycles() {
    const cycles = [];
    const visited = new Set();
    const recStack = new Set();

    const dfs = (nodeId, path) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      // Найти все соседей
      this.edges.forEach((edge) => {
        if (edge.source === nodeId) {
          const neighbor = edge.target;
          
          if (!visited.has(neighbor)) {
            dfs(neighbor, [...path]);
          } else if (recStack.has(neighbor)) {
            // Найден цикл
            const cycleStart = path.indexOf(neighbor);
            if (cycleStart !== -1) {
              const cycle = path.slice(cycleStart);
              cycles.push(cycle);
            }
          }
        }
      });

      recStack.delete(nodeId);
    };

    const nodeIds = Array.from(this.nodes.keys());
    nodeIds.forEach(nodeId => {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    });

    this.cycles = cycles;
    return cycles;
  }

  /**
   * Получить метрики графа
   */
  getMetrics() {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      sessionCount: this.sessions.length,
      cycleCount: this.cycles ? this.cycles.length : 0,
      avgNodeDegree: this.edges.size > 0 ? (2 * this.edges.size) / this.nodes.size : 0,
      avgPageRank: Array.from(this.nodes.values()).reduce((sum, node) => sum + node.pageRank, 0) / this.nodes.size
    };
  }

  /**
   * Экспортировать граф в JSON
   */
  toJSON() {
    return {
      nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({ id, ...node })),
      edges: Array.from(this.edges.entries()).map(([key, edge]) => edge),
      sessions: this.sessions,
      cycles: this.cycles || []
    };
  }

  /**
   * Импортировать граф из JSON
   */
  fromJSON(data) {
    this.nodes.clear();
    this.edges.clear();
    this.sessions = [];

    if (data.nodes) {
      data.nodes.forEach(node => {
        const { id, ...properties } = node;
        this.addNode(id, properties);
      });
    }

    if (data.edges) {
      data.edges.forEach(edge => {
        this.addEdge(edge.source, edge.target, edge.weight, edge);
      });
    }

    if (data.sessions) {
      this.sessions = data.sessions;
    }

    if (data.cycles) {
      this.cycles = data.cycles;
    }
  }

  /**
   * Очистить граф
   */
  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.sessions = [];
    this.cycles = [];
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BehaviorGraph;
}
