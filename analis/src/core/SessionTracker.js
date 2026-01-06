/**
 * Трекинг сессий пользователя
 * Ответствен за креатив, роутинг, сохранение
 */

class SessionTracker {
  constructor(config = {}) {
    this.sessions = new Map();   // sessionId → session
    this.currentSession = null;  // текущая сессия
    this.config = {
      sessionTimeout: 30 * 60 * 1000,  // 30 мин
      maxEvents: 1000,
      enableAutoSave: true,
      ...config
    };
    this.listeners = {};
    this.startTime = Date.now();
  }

  /**
   * Сохранить событие в текущую сессию
   * @param {object} event - Объект события
   */
  recordEvent(event) {
    if (!this.currentSession) {
      this.startNewSession();
    }

    const session = this.currentSession;

    // Добавить таймстемп
    event.timestamp = event.timestamp || Date.now();

    session.events.push(event);
    session.path.push(event.target || event.selector);
    session.lastEventTime = event.timestamp;
    session.duration = event.timestamp - session.startTime;

    // Оверфлоу обнаружения
    if (session.events.length > this.config.maxEvents) {
      session.events.shift();
      session.path.shift();
    }

    // Проверить timeout
    if (session.duration > this.config.sessionTimeout) {
      this.endSession();
    }

    this.emit('eventRecorded', { session, event });
  }

  /**
   * Начать новую сессию
   */
  startNewSession() {
    if (this.currentSession) {
      this.endSession();
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    this.currentSession = {
      id: sessionId,
      startTime: now,
      endTime: null,
      duration: 0,
      lastEventTime: now,
      events: [],
      path: [],
      pageTitle: document?.title || 'unknown',
      pageUrl: window?.location?.href || 'unknown',
      userAgent: navigator?.userAgent || 'unknown',
      classification: null,
      metrics: {}
    };

    this.sessions.set(sessionId, this.currentSession);
    this.emit('sessionStarted', this.currentSession);
    
    return this.currentSession;
  }

  /**
   * Закончить текущую сессию
   */
  endSession() {
    if (!this.currentSession) return null;

    const session = this.currentSession;
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    // Очистить дубликаты в path
    session.uniquePath = [...new Set(session.path)];

    this.emit('sessionEnded', session);

    if (this.config.enableAutoSave) {
      this.saveSession(session);
    }

    this.currentSession = null;
    return session;
  }

  /**
   * Пауза текущей сессии (без окончания)
   */
  pauseSession() {
    if (!this.currentSession) return null;
    
    this.currentSession.pausedAt = Date.now();
    this.emit('sessionPaused', this.currentSession);
    return this.currentSession;
  }

  /**
   * Восновить паузированную сессию
   */
  resumeSession() {
    if (!this.currentSession) {
      this.startNewSession();
      return this.currentSession;
    }

    if (this.currentSession.pausedAt) {
      const pauseDuration = Date.now() - this.currentSession.pausedAt;
      this.currentSession.pausedAt = null;
      this.currentSession.totalPauseDuration = 
        (this.currentSession.totalPauseDuration || 0) + pauseDuration;
    }

    this.emit('sessionResumed', this.currentSession);
    return this.currentSession;
  }

  /**
   * Получить текущую сессию
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Получить сессию по ID
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Получить все сессии
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Количество сессий
   */
  getSessionCount() {
    return this.sessions.size;
  }

  /**
   * Обновить классификацию сессии
   */
  setClassification(sessionId, classification) {
    const session = this.getSession(sessionId);
    if (session) {
      session.classification = classification;
      this.emit('sessionClassified', { session, classification });
    }
  }

  /**
   * Обновить метрики сессии
   */
  setMetrics(sessionId, metrics) {
    const session = this.getSession(sessionId);
    if (session) {
      session.metrics = { ...session.metrics, ...metrics };
      this.emit('sessionMetricsUpdated', { session, metrics });
    }
  }

  /**
   * Сохранить сессию (напр. локально)
   */
  saveSession(session) {
    this.emit('sessionSaved', session);
  }

  /**
   * Поиск сессий по критериям
   */
  filterSessions(predicate) {
    return Array.from(this.sessions.values()).filter(predicate);
  }

  /**
   * Очистить все сессии
   */
  clearSessions() {
    this.sessions.clear();
    this.currentSession = null;
    this.emit('sessionsCleaned', {});
  }

  /**
   * Подписаться на события
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  /**
   * Отписаться от событий
   */
  off(eventName, callback) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
  }

  /**
   * Выпустить событие
   */
  emit(eventName, data) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[SessionTracker] Error in listener: ${error}`);
      }
    });
  }

  /**
   * Получить статистику
   */
  getStats() {
    const sessions = this.getAllSessions();
    const durations = sessions.map(s => s.duration || 0);
    const eventCounts = sessions.map(s => s.events.length);

    return {
      totalSessions: sessions.length,
      activeSessions: this.currentSession ? 1 : 0,
      totalEvents: sessions.reduce((sum, s) => sum + s.events.length, 0),
      avgSessionDuration: durations.length > 0 ? 
        durations.reduce((a, b) => a + b) / durations.length : 0,
      avgEventsPerSession: eventCounts.length > 0 ?
        eventCounts.reduce((a, b) => a + b) / eventCounts.length : 0,
      longestSession: Math.max(...durations, 0),
      shortestSession: Math.min(...durations.filter(d => d > 0), Infinity)
    };
  }

  /**
   * Експортировать все данные в JSON
   */
  toJSON() {
    return {
      sessions: this.getAllSessions(),
      stats: this.getStats(),
      exportTime: Date.now()
    };
  }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionTracker;
}
