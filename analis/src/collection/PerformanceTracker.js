/**
 * Мониторинг перформанса
 * Отслеживает: CPU, память, FPS, время ответа
 */

class PerformanceTracker {
  constructor(sessionTracker, config = {}) {
    this.sessionTracker = sessionTracker;
    this.config = {
      trackMemory: true,
      trackFPS: true,
      trackLongTasks: true,
      intervalTime: 5000, // мс
      ...config
    };
    this.isEnabled = false;
    this.intervalId = null;
    this.frameCount = 0;
    this.fps = 0;
    this.lastFrameTime = performance.now();
  }

  /**
   * Включить мониторинг
   */
  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;

    // Периодические измерения
    this.intervalId = setInterval(() => {
      this.recordMetrics();
    }, this.config.intervalTime);

    if (this.config.trackFPS) this.enableFPSTracking();
    if (this.config.trackLongTasks) this.enableLongTaskTracking();

    console.log('[PerformanceTracker] Мониторинг включен');
  }

  /**
   * Отключить мониторинг
   */
  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('[PerformanceTracker] Мониторинг отключен');
  }

  /**
   * Записать метрики перформанса
   */
  recordMetrics() {
    const metrics = this.getMetrics();
    
    const event = {
      type: 'performance_metrics',
      timestamp: Date.now(),
      ...metrics
    };

    this.sessionTracker.recordEvent(event);
  }

  /**
   * Получить текущие метрики
   */
  getMetrics() {
    return {
      memory: this.config.trackMemory ? this.getMemoryMetrics() : null,
      navigation: this.getNavigationMetrics(),
      fps: this.fps,
      pageMetrics: this.getPageMetrics()
    };
  }

  /**
   * Получить метрики памяти
   */
  getMemoryMetrics() {
    if (!performance.memory) {
      return null;
    }

    const memory = performance.memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(2)
    };
  }

  /**
   * Получить метрики навигации
   */
  getNavigationMetrics() {
    if (!window.performance || !window.performance.timing) {
      return null;
    }

    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;

    return {
      domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
      loadComplete: timing.loadEventEnd - navigationStart,
      timeToFirstByte: timing.responseStart - navigationStart,
      domInteractive: timing.domInteractive - navigationStart
    };
  }

  /**
   * Получить метрики страницы
   */
  getPageMetrics() {
    return {
      elementCount: document.querySelectorAll('*').length,
      styleSheetCount: document.styleSheets.length,
      imageCount: document.querySelectorAll('img').length,
      linkCount: document.querySelectorAll('a').length
    };
  }

  /**
   * Отслеживать FPS
   */
  enableFPSTracking() {
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;

      if (delta > 0) {
        this.fps = Math.round(1000 / delta);
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Отслеживать длительные таски (>50ms)
   */
  enableLongTaskTracking() {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.duration > 50) {
            const event = {
              type: 'long_task',
              timestamp: Date.now(),
              duration: entry.duration,
              startTime: entry.startTime,
              attribution: entry.attribution
            };
            
            this.sessionTracker.recordEvent(event);
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('[PerformanceTracker] longtask not supported');
      }
    } catch (error) {
      console.warn('[PerformanceTracker] PerformanceObserver not available');
    }
  }

  /**
   * Получить средние метрики сессии
   */
  getSessionAverageMetrics(events) {
    const perfEvents = events.filter(e => e.type === 'performance_metrics');
    
    if (perfEvents.length === 0) return null;

    const avgMemory = perfEvents.reduce((sum, e) => {
      return sum + (e.memory?.usagePercentage || 0);
    }, 0) / perfEvents.length;

    const avgFPS = perfEvents.reduce((sum, e) => {
      return sum + (e.fps || 0);
    }, 0) / perfEvents.length;

    return {
      avgMemoryUsage: avgMemory.toFixed(2) + '%',
      avgFPS: Math.round(avgFPS),
      sampleCount: perfEvents.length
    };
  }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceTracker;
}
