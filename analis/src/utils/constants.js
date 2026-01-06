/**
 * Константы и конфигурация
 */

const CONSTANTS = {
  // Экстеншен информация
  EXTENSION_NAME: 'Behavior Graph Analyzer',
  EXTENSION_VERSION: '1.0.0',
  EXTENSION_ID: 'behavior-graph-analyzer',

  // Датабаза
  DB: {
    NAME: 'BehaviorGraphDB',
    VERSION: 1,
    STORES: ['sessions', 'graphs', 'metrics', 'settings']
  },

  // Сессии
  SESSION: {
    TIMEOUT: 30 * 60 * 1000, // 30 мин
    MAX_EVENTS: 1000,
    MAX_SESSIONS: 1000
  },

  // Граф
  GRAPH: {
    MAX_NODES: 10000,
    MAX_EDGES: 50000,
    PAGE_RANK_ITERATIONS: 20,
    DAMPING_FACTOR: 0.85,
    WEIGHT_ALPHA: 0.5,
    WEIGHT_BETA: 0.3,
    WEIGHT_GAMMA: 0.2
  },

  // Бот-детектор
  BOT_DETECTOR: {
    THRESHOLD: 0.6,
    MIN_PATH_VARIETY: 0.4,
    MIN_AVG_DURATION: 300, // мс
    MAX_AVG_DURATION: 50,  // мс
    MIN_CYCLE_COMPLEXITY: 2,
    HUMAN_CLASS: 'HUMAN',
    BOT_CLASS: 'BOT'
  },

  // Перформанс
  PERFORMANCE: {
    METRICS_INTERVAL: 5000, // мс
    FPS_TARGET: 60,
    LONG_TASK_THRESHOLD: 50 // мс
  },

  // Особые события
  EVENTS: {
    CLICK: 'click',
    HOVER: 'hover',
    SCROLL: 'scroll',
    NAVIGATION: 'navigation',
    DOM_CHANGE: 'dom_change',
    PERFORMANCE: 'performance_metrics',
    LONG_TASK: 'long_task',
    PAGE_LOAD: 'page_load',
    URL_CHANGE: 'url_change'
  },

  // UI настройки
  UI: {
    POPUP_WIDTH: 1200,
    POPUP_HEIGHT: 800,
    GRAPH_PADDING: 50,
    NODE_SIZE_MIN: 20,
    NODE_SIZE_MAX: 60
  },

  // Ответы
  TIMEOUTS: {
    DEBOUNCE: 100,
    THROTTLE: 250,
    HOVER_DELAY: 100,
    SCROLL_DELAY: 250
  },

  // Цвета для UI
  COLORS: {
    PRIMARY: '#0891b2',
    SECONDARY: '#f97316',
    SUCCESS: '#22c55e',
    WARNING: '#eab308',
    DANGER: '#ef4444',
    TEXT: '#1f2937',
    TEXT_LIGHT: '#6b7280',
    BG: '#f3f4f6'
  },

  // Логи
  LOGGING: {
    LEVEL: 'info',
    STORE_HISTORY: true,
    MAX_HISTORY: 1000
  },

  // Конфигурация Cytoscape
  CYTOSCAPE: {
    LAYOUT: {
      NAME: 'spring',
      DIRECTED: true,
      ANIMATE: true,
      ANIMATE_DURATION: 500
    },
    STYLE: [
      {
        selector: 'node',
        style: {
          'background-color': '#0891b2',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': 12,
          'color': '#ffffff'
        }
      },
      {
        selector: 'edge',
        style: {
          'line-color': '#999999',
          'target-arrow-color': '#999999',
          'target-arrow-shape': 'triangle',
          'width': 2,
          'opacity': 0.6
        }
      }
    ]
  },

  // Минимальные данные
  MINIMAL_SESSION: {
    EVENT_COUNT: 5,
    DURATION: 1000 // мс
  },

  // Категории
  CATEGORIES: {
    BOTS: 'bots',
    HUMANS: 'humans',
    SUSPICIOUS: 'suspicious'
  }
};

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONSTANTS;
}
