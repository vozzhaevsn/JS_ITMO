/**
 * BotDetector - Классификация поведения как боты vs люди
 * Использует поведенческие признаки и graph metrics
 */
class BotDetector {
  constructor() {
    this.thresholds = {
      minAvgDuration: 300,      // мс между кликами
      maxAvgDuration: 50,       // мс - скорость бота
      minPathVariety: 0.4,      // разнообразие маршрутов
      minCycleComplexity: 2,    // длина цикла
      maxRandomness: 0.95       // случайность навигации
    };
    this.features = [];
  }

  /**
   * Экстрактор признаков из сессии
   * @param {object} session - Объект сессии
   * @returns {array} Вектор признаков [f1, f2, f3, ...]
   */
  extractFeatures(session) {
    const features = [];

    // Признак 1: Разнообразие маршрутов (path variety)
    const uniqueTransitions = new Set(
      session.path.map((_, i) => 
        i > 0 ? `${session.path[i-1]}→${session.path[i]}` : null
      ).filter(Boolean)
    );
    const pathVariety = uniqueTransitions.size / Math.max(session.path.length, 1);
    features.push(pathVariety); // Люди: 0.5-0.9, Боты: <0.2

    // Признак 2: Наличие циклов
    const cycles = this.detectCyclesInSession(session);
    const hasComplexCycles = cycles.some(c => c.length > 2);
    features.push(hasComplexCycles ? 1 : 0); // Люди: 1, Боты: 0

    // Признак 3: Среднее время между событиями
    const timings = [];
    for (let i = 1; i < session.events.length; i++) {
      timings.push(
        session.events[i].timestamp - session.events[i-1].timestamp
      );
    }
    const avgTiming = timings.length > 0 
      ? timings.reduce((a, b) => a + b, 0) / timings.length 
      : 1000;
    features.push(avgTiming / 1000); // Люди: 0.5-5s, Боты: 0.05-0.2s

    // Признак 4: Стандартное отклонение времени (вариативность)
    const mean = avgTiming;
    const variance = timings.length > 0
      ? timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timings.length
      : 0;
    const stdDev = Math.sqrt(variance);
    features.push(stdDev / Math.max(mean, 1)); // Люди: >0.5, Боты: <0.2

    // Признак 5: Наличие hover/scroll
    const hasHoverOrScroll = session.events.some(e => 
      e.type === 'hover' || e.type === 'scroll'
    );
    features.push(hasHoverOrScroll ? 1 : 0); // Люди: 1, Боты: 0

    // Признак 6: Количество уникальных типов событий
    const eventTypes = new Set(session.events.map(e => e.type));
    features.push(eventTypes.size); // Люди: 3-5 типов, Боты: 1-2

    return features;
  }

  /**
   * Простой классификатор на основе эвристик
   * @param {array} features - Вектор признаков
   * @returns {object} { prediction: 'HUMAN'|'BOT', confidence: 0-1 }
   */
  classify(features) {
    let humanScore = 0;
    const weights = [0.25, 0.20, 0.20, 0.15, 0.15, 0.05];

    // Правило 1: Разнообразие маршрутов
    if (features[0] > this.thresholds.minPathVariety) {
      humanScore += weights[0]; // Люди имеют разные пути
    }

    // Правило 2: Сложные циклы
    if (features[1] === 1) {
      humanScore += weights[1]; // Люди возвращаются и исследуют
    }

    // Правило 3: Адекватное время между событиями
    if (features[2] > 0.3 && features[2] < 5) {
      humanScore += weights[2]; // Люди кликают медленнее, чем боты
    }

    // Правило 4: Вариативность времени
    if (features[3] > 0.5) {
      humanScore += weights[3]; // Люди непредсказуемы
    }

    // Правило 5: Hover/scroll
    if (features[4] === 1) {
      humanScore += weights[4]; // Люди наводят и скролят
    }

    // Правило 6: Разные типы событий
    if (features[5] >= 3) {
      humanScore += weights[5]; // Люди используют разные интеракции
    }

    const prediction = humanScore > 0.6 ? 'HUMAN' : 'BOT';
    return {
      prediction,
      confidence: Math.abs(humanScore - 0.5) * 2, // 0-1
      score: humanScore,
      features
    };
  }

  /**
   * Пакетная классификация нескольких сессий
   * @param {array} sessions 
   * @returns {object} Статистика классификации
   */
  classifyBatch(sessions) {
    const results = sessions.map(session => ({
      sessionId: session.id,
      ...this.classify(this.extractFeatures(session))
    }));

    const humanCount = results.filter(r => r.prediction === 'HUMAN').length;
    const botCount = results.filter(r => r.prediction === 'BOT').length;

    return {
      results,
      summary: {
        total: results.length,
        humans: humanCount,
        bots: botCount,
        humanPercentage: results.length > 0 ? (humanCount / results.length * 100).toFixed(2) + '%' : '0%',
        avgConfidence: results.length > 0 ? (results.reduce((s, r) => s + r.confidence, 0) / results.length).toFixed(3) : '0'
      }
    };
  }

  /**
   * Обнаружить циклы в сессии
   * @param {object} session 
   * @returns {array} Массив циклов
   */
  detectCyclesInSession(session) {
    const cycles = [];
    const visited = new Set();
    const recStack = new Set();

    const dfs = (nodeIdx, path) => {
      const nodeId = session.path[nodeIdx];
      visited.add(nodeId);
      recStack.add(nodeId);
      path = [...path, nodeId];

      for (let i = 0; i < session.path.length; i++) {
        if (i !== nodeIdx) {
          const nextId = session.path[i];
          if (!visited.has(nextId)) {
            dfs(i, path);
          } else if (recStack.has(nextId)) {
            const cycleStart = path.indexOf(nextId);
            const cycle = path.slice(cycleStart);
            if (cycle.length > 1) {
              cycles.push(cycle);
            }
          }
        }
      }

      recStack.delete(nodeId);
    };

    for (let i = 0; i < session.path.length; i++) {
      const nodeId = session.path[i];
      if (!visited.has(nodeId)) {
        dfs(i, []);
      }
    }

    return cycles;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BotDetector;
}
