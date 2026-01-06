/**
 * Content Script - запускается на всех веб-страницах
 * Ответствен за: сбор данных, отправка background
 */

console.log('[ContentScript] Нагружен');

// Проверить доступность

if (!window.__BEHAVIOR_GRAPH_LOADED__) {
  window.__BEHAVIOR_GRAPH_LOADED__ = true;

  // Отправлять сообщение background
  function sendMessage(type, data) {
    chrome.runtime.sendMessage(
      { type, data },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[ContentScript] Error:', chrome.runtime.lastError);
        }
      }
    );
  }

  /**
   * Отслеживать клики
   */
  function initClickTracking() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      const event = {
        type: 'click',
        timestamp: Date.now(),
        selector: getSelector(target),
        target: target.id || target.className,
        text: target.textContent?.substring(0, 50) || '',
        x: e.clientX,
        y: e.clientY,
        tagName: target.tagName
      };

      sendMessage('RECORD_EVENT', event);
    });
  }

  /**
   * Отслеживать навигацию
   */
  function initNavigationTracking() {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPushState.apply(this, args);
      const event = {
        type: 'navigation',
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title
      };
      sendMessage('RECORD_EVENT', event);
    };

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      const event = {
        type: 'navigation',
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title
      };
      sendMessage('RECORD_EVENT', event);
    };
  }

  /**
   * Отслеживать скролл
   */
  function initScrollTracking() {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const event = {
          type: 'scroll',
          timestamp: Date.now(),
          x: window.scrollX,
          y: window.scrollY
        };
        sendMessage('RECORD_EVENT', event);
      }, 250);
    });
  }

  /**
   * Получить CSS-селектор
   */
  function getSelector(element) {
    if (!element || !element.tagName) return 'unknown';
    if (element.id) return `#${element.id}`;
    const path = [];
    while (element && element.parentElement) {
      path.unshift(element.tagName.toLowerCase());
      element = element.parentElement;
    }
    return path.slice(0, 3).join(' > ');
  }

  // Начать трекинг
  initClickTracking();
  initNavigationTracking();
  initScrollTracking();

  // Отправить синал загрузки
  sendMessage('PAGE_LOADED', {
    url: window.location.href,
    title: document.title,
    timestamp: Date.now()
  });

  console.log('[ContentScript] Трекинг инициализирован');
}
