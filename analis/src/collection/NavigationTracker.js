/**
 * Мониторинг навигации (SPA)
 * Отслеживает изменения URL, тайтла, загрузки страниц
 */

class NavigationTracker {
  constructor(sessionTracker, config = {}) {
    this.sessionTracker = sessionTracker;
    this.config = {
      trackUrlChanges: true,
      trackPageLoads: true,
      trackNavigationTiming: true,
      ...config
    };
    this.isEnabled = false;
    this.lastUrl = window.location.href;
    this.lastTitle = document.title;
    this.navigationObserver = null;
  }

  /**
   * Включить мониторинг
   */
  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;

    if (this.config.trackUrlChanges) this.enableUrlTracking();
    if (this.config.trackPageLoads) this.enablePageLoadTracking();
    if (this.config.trackNavigationTiming) this.enableNavigationTiming();

    console.log('[NavigationTracker] Мониторинг включен');
  }

  /**
   * Отключить мониторинг
   */
  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    window.removeEventListener('popstate', this.boundPopStateHandler);
    
    if (this.navigationObserver) {
      this.navigationObserver.disconnect();
    }

    console.log('[NavigationTracker] Мониторинг отключен');
  }

  /**
   * Отслеживать изменения URL
   */
  enableUrlTracking() {
    // Перехват pushState/replaceState
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const trackNavigation = (state, title, url) => {
      if (url !== this.lastUrl) {
        const event = {
          type: 'url_change',
          timestamp: Date.now(),
          oldUrl: this.lastUrl,
          newUrl: url || window.location.href,
          title: document.title,
          method: 'history_api'
        };
        
        this.sessionTracker.recordEvent(event);
        this.lastUrl = url || window.location.href;
      }
    };

    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      trackNavigation(...args);
    };

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      trackNavigation(...args);
    };

    // Перехват popstate
    this.boundPopStateHandler = () => {
      const event = {
        type: 'popstate',
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title
      };
      
      this.sessionTracker.recordEvent(event);
      this.lastUrl = window.location.href;
    };

    window.addEventListener('popstate', this.boundPopStateHandler);
  }

  /**
   * Отслеживать загрузки страниц
   */
  enablePageLoadTracking() {
    // Отслеживать изменения тайтла
    this.navigationObserver = new MutationObserver(() => {
      if (document.title !== this.lastTitle) {
        const event = {
          type: 'title_change',
          timestamp: Date.now(),
          oldTitle: this.lastTitle,
          newTitle: document.title,
          url: window.location.href
        };
        
        this.sessionTracker.recordEvent(event);
        this.lastTitle = document.title;
      }
    });

    this.navigationObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Отправить событие загрузки
    if (document.readyState === 'complete') {
      this.recordPageLoad();
    } else {
      window.addEventListener('load', () => this.recordPageLoad());
    }
  }

  /**
   * Отправить событие загрузки
   */
  recordPageLoad() {
    const event = {
      type: 'page_load',
      timestamp: Date.now(),
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      readyState: document.readyState
    };
    
    this.sessionTracker.recordEvent(event);
  }

  /**
   * Отслеживать timing навигации
   */
  enableNavigationTiming() {
    if (!window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const event = {
              type: 'navigation_timing',
              timestamp: Date.now(),
              url: entry.name,
              duration: entry.duration,
              redirectCount: entry.redirectCount,
              transferSize: entry.transferSize,
              decodedBodySize: entry.decodedBodySize
            };
            
            this.sessionTracker.recordEvent(event);
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('[NavigationTracker] PerformanceObserver not supported:', error);
    }
  }

  /**
   * Получить тиминг навигации
   */
  getNavigationTiming() {
    if (!window.performance || !window.performance.timing) {
      return null;
    }

    const timing = window.performance.timing;
    return {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom: timing.domInteractive - timing.domLoading,
      load: timing.loadEventEnd - timing.loadEventStart,
      total: timing.loadEventEnd - timing.navigationStart
    };
  }

  /**
   * Получить текущие данные паги
   */
  getCurrentPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      host: window.location.host,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash
    };
  }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigationTracker;
}
