/**
 * EventTracker - Content Script для сбора событий пользователя
 * Отправляет данные в Service Worker через messaging
 */
class EventTracker {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.pageLoadTime = performance.now();
    this.lastUrl = window.location.href;
  }

  /**
   * Инициализировать слушатели событий
   */
  init() {
    console.log('[EventTracker] Инициализирован для сессии:', this.sessionId);

    // 1. Слушать клики
    document.addEventListener('click', (e) => {
      this.recordEvent('click', e.target, { 
        clientX: e.clientX, 
        clientY: e.clientY 
      });
    }, true);

    // 2. Слушать наведение (hover)
    document.addEventListener('mouseenter', (e) => {
      if (this.isInteractiveElement(e.target)) {
        this.recordEvent('hover', e.target);
      }
    }, true);

    // 3. Слушать скролл
    document.addEventListener('scroll', () => {
      this.recordEvent('scroll', document.documentElement);
    }, { passive: true });

    // 4. Слушать SPA навигацию
    window.addEventListener('popstate', () => {
      this.recordEvent('navigation', window.location);
    });

    // 5. Перехватить fetch/XHR для SPA
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch.apply(this, args);
      if (response.ok) {
        setTimeout(() => this.checkPageChange(), 500);
      }
      return response;
    };
  }

  /**
   * Записать событие и отправить в background
   */
  recordEvent(type, target, metadata = {}) {
    const selector = this.getSelector(target);
    
    const event = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      pageLoad: this.pageLoadTime,
      timeSincePageLoad: Date.now() - this.pageLoadTime,
      target: {
        selector,
        tagName: target.tagName || 'document',
        className: target.className || '',
        id: target.id || '',
        text: this.getSafeText(target),
        ariaLabel: target.getAttribute?.('aria-label') || ''
      },
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      },
      metadata
    };

    this.events.push(event);

    // Отправить в background script
    chrome.runtime.sendMessage({
      type: 'ADD_EVENT',
      payload: event,
      sessionId: this.sessionId
    }).catch(err => {
      console.debug('[EventTracker] Background недоступен:', err);
    });
  }

  /**
   * Получить CSS селектор для элемента
   */
  getSelector(element) {
    if (!element || element === document) return 'document';
    
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    const path = [];
    let current = element;

    while (current && current !== document) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${CSS.escape(current.id)}`;
        path.unshift(selector);
        break;
      }

      let sibling = current.previousElementSibling;
      let nth = 1;
      while (sibling) {
        if (sibling.tagName.toLowerCase() === current.tagName.toLowerCase()) {
          nth++;
        }
        sibling = sibling.previousElementSibling;
      }

      if (nth > 1 || current.className) {
        selector += nth > 1 ? `:nth-of-type(${nth})` : '';
        if (current.className) {
          selector += '.' + CSS.escape(current.className.split(' ')[0]);
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.slice(0, 5).join(' > ');
  }

  /**
   * Проверить интерактивный элемент
   */
  isInteractiveElement(el) {
    const tags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    return tags.includes(el.tagName) || el.onclick !== null;
  }

  /**
   * Получить безопасный текст элемента
   */
  getSafeText(element) {
    const text = (element.textContent || '').trim();
    return text.substring(0, 100);
  }

  /**
   * Генерировать ID сессии
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Генерировать ID события
   */
  generateEventId() {
    return `ev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  /**
   * Проверить изменение страницы (для SPA)
   */
  checkPageChange() {
    const currentUrl = window.location.href;
    if (this.lastUrl !== currentUrl) {
      this.lastUrl = currentUrl;
      this.recordEvent('navigation', window.location);
    }
  }
}

// Инициализация
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const tracker = new EventTracker();
    tracker.init();
  });
} else {
  const tracker = new EventTracker();
  tracker.init();
}
