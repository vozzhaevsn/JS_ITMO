/**
 * Трекинг событий пользователя
 * Прослушивают клики, hover, scroll, navigation
 */

class EventTracker {
  constructor(sessionTracker, config = {}) {
    this.sessionTracker = sessionTracker;
    this.config = {
      trackClicks: true,
      trackHover: true,
      trackScroll: true,
      trackNavigation: true,
      hoverDebounceTime: 100,
      scrollDebounceTime: 250,
      ...config
    };
    this.isEnabled = false;
    this.hoverTimeout = null;
    this.scrollTimeout = null;
  }

  /**
   * Включить трекинг
   */
  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;

    if (this.config.trackClicks) this.enableClickTracking();
    if (this.config.trackHover) this.enableHoverTracking();
    if (this.config.trackScroll) this.enableScrollTracking();
    if (this.config.trackNavigation) this.enableNavigationTracking();

    console.log('[EventTracker] Трекинг включен');
  }

  /**
   * Отключить трекинг
   */
  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    document.removeEventListener('click', this.boundClickHandler);
    document.removeEventListener('mouseover', this.boundHoverHandler);
    window.removeEventListener('scroll', this.boundScrollHandler);
    window.removeEventListener('popstate', this.boundNavigationHandler);

    console.log('[EventTracker] Трекинг отключен');
  }

  /**
   * Отслеживать клики
   */
  enableClickTracking() {
    this.boundClickHandler = (e) => {
      const target = e.target;
      const event = {
        type: 'click',
        timestamp: Date.now(),
        selector: this.getSelector(target),
        target: this.getTargetId(target),
        text: target.textContent?.substring(0, 50) || '',
        coordinates: {
          x: e.clientX,
          y: e.clientY
        },
        tagName: target.tagName,
        className: target.className
      };

      this.sessionTracker.recordEvent(event);
    };

    document.addEventListener('click', this.boundClickHandler);
  }

  /**
   * Отслеживать наведение мышю
   */
  enableHoverTracking() {
    this.boundHoverHandler = (e) => {
      clearTimeout(this.hoverTimeout);
      
      this.hoverTimeout = setTimeout(() => {
        const target = e.target;
        if (target === document) return;

        const event = {
          type: 'hover',
          timestamp: Date.now(),
          selector: this.getSelector(target),
          target: this.getTargetId(target),
          tagName: target.tagName,
          className: target.className
        };

        this.sessionTracker.recordEvent(event);
      }, this.config.hoverDebounceTime);
    };

    document.addEventListener('mouseover', this.boundHoverHandler);
  }

  /**
   * Отслеживать скролл
   */
  enableScrollTracking() {
    this.boundScrollHandler = (e) => {
      clearTimeout(this.scrollTimeout);
      
      this.scrollTimeout = setTimeout(() => {
        const event = {
          type: 'scroll',
          timestamp: Date.now(),
          position: {
            x: window.scrollX,
            y: window.scrollY
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          scrollPercentage: {
            x: (window.scrollX / (document.documentElement.scrollWidth - window.innerWidth)) * 100,
            y: (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
          }
        };

        this.sessionTracker.recordEvent(event);
      }, this.config.scrollDebounceTime);
    };

    window.addEventListener('scroll', this.boundScrollHandler);
  }

  /**
   * Отслеживать навигацию (SPA)
   */
  enableNavigationTracking() {
    this.boundNavigationHandler = (e) => {
      const event = {
        type: 'navigation',
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title,
        referrer: document.referrer
      };

      this.sessionTracker.recordEvent(event);
    };

    window.addEventListener('popstate', this.boundNavigationHandler);

    // Перехват pushState и replaceState
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = (...args) => {
      originalPushState.apply(window.history, args);
      this.boundNavigationHandler();
    };

    window.history.replaceState = (...args) => {
      originalReplaceState.apply(window.history, args);
      this.boundNavigationHandler();
    };
  }

  /**
   * Получить CSS-селектор для элемента
   */
  getSelector(element) {
    if (!element || !element.tagName) return 'unknown';

    if (element.id) {
      return `#${element.id}`;
    }

    const path = [];
    while (element && element.parentElement) {
      let selector = element.tagName.toLowerCase();
      
      if (element.id) {
        selector += `#${element.id}`;
        path.unshift(selector);
        break;
      }

      if (element.className) {
        selector += `.${element.className.split(' ').join('.')}`;
      }

      path.unshift(selector);
      element = element.parentElement;
    }

    return path.slice(0, 5).join(' > '); // Лимит глубины
  }

  /**
   * Получить уникальный идентификатор элемента
   */
  getTargetId(element) {
    if (element.id) return element.id;
    if (element.getAttribute('data-id')) return element.getAttribute('data-id');
    if (element.getAttribute('data-testid')) return element.getAttribute('data-testid');
    
    // Генерировать hash она основе селектора
    return this.hashCode(this.getSelector(element)).toString();
  }

  /**
   * Простая hash-функция
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Конвертировать в 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Получить текущие настройки
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Обновить настройки
   */
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventTracker;
}
