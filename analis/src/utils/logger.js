/**
 * Логгер с разными уровнями
 * Вопырка о всяком выне доставляются метаданные
 */

class Logger {
  constructor(config = {}) {
    this.config = {
      level: 'info',
      useTimestamp: true,
      useColors: true,
      storeHistory: true,
      maxHistorySize: 1000,
      ...config
    };

    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    this.colors = {
      debug: '[36m', // cyan
      info: '[32m',  // green
      warn: '[33m',  // yellow
      error: '[31m', // red
      reset: '[0m'
    };

    this.history = [];
  }

  /**
   * Относительная высота мессажа
   */
  shouldLog(level) {
    return this.levels[level] >= this.levels[this.config.level];
  }

  /**
   * Относительная метка времени
   */
  getTimestamp() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  }

  /**
   * Относительная метка
   */
  formatMessage(level, message, data) {
    const timestamp = this.config.useTimestamp ? `[${this.getTimestamp()}] ` : '';
    const color = this.config.useColors ? this.colors[level] : '';
    const reset = this.config.useColors ? this.colors.reset : '';
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';

    return `${color}${timestamp}[${level.toUpperCase()}]${reset} ${message}${dataStr}`;
  }

  /**
   * Относительная история
   */
  saveToHistory(level, message, data) {
    if (!this.config.storeHistory) return;

    this.history.push({
      level,
      message,
      data,
      timestamp: Date.now()
    });

    // Ограничить размер истории
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(-this.config.maxHistorySize);
    }
  }

  /**
   * Debug уровень
   */
  debug(message, data) {
    if (!this.shouldLog('debug')) return;
    const formatted = this.formatMessage('debug', message, data);
    console.log(formatted);
    this.saveToHistory('debug', message, data);
  }

  /**
   * Info уровень
   */
  info(message, data) {
    if (!this.shouldLog('info')) return;
    const formatted = this.formatMessage('info', message, data);
    console.log(formatted);
    this.saveToHistory('info', message, data);
  }

  /**
   * Warn уровень
   */
  warn(message, data) {
    if (!this.shouldLog('warn')) return;
    const formatted = this.formatMessage('warn', message, data);
    console.warn(formatted);
    this.saveToHistory('warn', message, data);
  }

  /**
   * Error уровень
   */
  error(message, data) {
    if (!this.shouldLog('error')) return;
    const formatted = this.formatMessage('error', message, data);
    console.error(formatted);
    this.saveToHistory('error', message, data);
  }

  /**
   * Получить историю
   */
  getHistory(level = null) {
    if (!level) return this.history;
    return this.history.filter(log => log.level === level);
  }

  /**
   * Очистить историю
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Экспортировать историю в JSON
   */
  exportHistory() {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Обновить уровень логирования
   */
  setLevel(level) {
    if (!this.levels.hasOwnProperty(level)) {
      console.warn(`Unknown log level: ${level}`);
      return;
    }
    this.config.level = level;
  }

  /**
   * Получить текущие расстройки
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Группировать мессажи для дебага
   */
  getStats() {
    const stats = { debug: 0, info: 0, warn: 0, error: 0 };
    this.history.forEach(log => {
      stats[log.level]++;
    });
    return stats;
  }
}

// Глобальные инстанци

const globalLogger = new Logger({
  level: 'info',
  useTimestamp: true,
  useColors: true,
  storeHistory: true
});

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Logger, globalLogger };
}
