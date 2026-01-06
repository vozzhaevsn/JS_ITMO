/**
 * Content Script - запускается на всех веб-страницах
 * Ответствен за: сбор данных, отправка background
 * Совместимо с: Chrome, Comet, и другими Chromium-based браузерами
 */

console.log('[ContentScript] Нагружен');

// Проверить доступность chrome API
const hasChromeAPI = () => {
  return typeof chrome !== 'undefined' && 
         chrome.runtime && 
         typeof chrome.runtime.sendMessage === 'function';
};

if (!window.__BEHAVIOR_GRAPH_LOADED__) {
  window.__BEHAVIOR_GRAPH_LOADED__ = true;

  /**
   * Безопасная отправка сообщения background скрипту
   * С обработкой ошибок для разных браузеров
   */
  function sendMessage(type, data) {
    // Проверить доступность API
    if (!hasChromeAPI()) {
      console.warn('[ContentScript] chrome.runtime API не доступен');
      return;
    }

    try {
      chrome.runtime.sendMessage(
        { type, data },
        (response) => {
          if (chrome.runtime.lastError) {
            // Это нормально - сообщение всё равно отправлено
            if (chrome.runtime.lastError.message.includes('close')) {
              console.log('[ContentScript] Background скрипт неактивен');
            }
          }
        }
      );
    } catch (error) {
      console.warn('[ContentScript] Ошибка sendMessage:', error.message);
    }
  }

  /**
   * Безопасное получение CSS-селектора элемента
   */
  function getSelector(element) {
    try {
      if (!element || !element.tagName) return 'unknown';
      
      // Если есть ID, использовать его
      if (element.id && element.id.trim()) {
        return `#${element.id}`;
      }
      
      // Построить path по иерархии DOM
      const path = [];
      let current = element;
      
      while (current && current.parentElement) {
        let selector = current.tagName.toLowerCase();
        
        // Добавить класс если есть
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/).slice(0, 2).join('.');
          if (classes) {
            selector += '.' + classes;
          }
        }
        
        path.unshift(selector);
        current = current.parentElement;
      }
      
      // Вернуть первые 3 селектора
      return path.slice(0, 3).join(' > ');
    } catch (error) {
      console.warn('[ContentScript] getSelector error:', error.message);
      return 'unknown';
    }
  }

  /**
   * Отслеживать клики с безопасностью
   */
  function initClickTracking() {
    try {
      document.addEventListener('click', (e) => {
        try {
          const target = e.target;
          const event = {
            type: 'click',
            timestamp: Date.now(),
            selector: getSelector(target),
            target: target.id || target.className || target.tagName,
            text: target.textContent?.substring(0, 50) || '',
            x: e.clientX,
            y: e.clientY,
            tagName: target.tagName
          };

          sendMessage('RECORD_EVENT', event);
        } catch (error) {
          console.warn('[ContentScript] Ошибка обработки клика:', error.message);
        }
      }, { passive: true });
    } catch (error) {
      console.warn('[ContentScript] initClickTracking error:', error.message);
    }
  }

  /**
   * Отслеживать навигацию в SPA приложениях
   */
  function initNavigationTracking() {
    try {
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;

      window.history.pushState = function(...args) {
        try {
          originalPushState.apply(this, args);
          const event = {
            type: 'navigation',
            timestamp: Date.now(),
            url: window.location.href,
            title: document.title
          };
          sendMessage('RECORD_EVENT', event);
        } catch (error) {
          console.warn('[ContentScript] pushState error:', error.message);
        }
      };

      window.history.replaceState = function(...args) {
        try {
          originalReplaceState.apply(this, args);
          const event = {
            type: 'navigation',
            timestamp: Date.now(),
            url: window.location.href,
            title: document.title
          };
          sendMessage('RECORD_EVENT', event);
        } catch (error) {
          console.warn('[ContentScript] replaceState error:', error.message);
        }
      };
    } catch (error) {
      console.warn('[ContentScript] initNavigationTracking error:', error.message);
    }
  }

  /**
   * Отслеживать скролл события
   */
  function initScrollTracking() {
    try {
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        try {
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
        } catch (error) {
          console.warn('[ContentScript] Ошибка обработки скролла:', error.message);
        }
      }, { passive: true });
    } catch (error) {
      console.warn('[ContentScript] initScrollTracking error:', error.message);
    }
  }

  /**
   * Отслеживать hover события на интерактивных элементах
   */
  function initHoverTracking() {
    try {
      const interactiveSelectors = 'a, button, input, [role="button"], [role="link"]';
      
      document.addEventListener('mouseenter', (e) => {
        try {
          if (e.target.matches(interactiveSelectors)) {
            const event = {
              type: 'hover',
              timestamp: Date.now(),
              selector: getSelector(e.target),
              tagName: e.target.tagName
            };
            sendMessage('RECORD_EVENT', event);
          }
        } catch (error) {
          console.warn('[ContentScript] Ошибка hover:', error.message);
        }
      }, { passive: true, capture: true });
    } catch (error) {
      console.warn('[ContentScript] initHoverTracking error:', error.message);
    }
  }

  // Начать трекинг
  try {
    initClickTracking();
    initNavigationTracking();
    initScrollTracking();
    initHoverTracking();

    // Отправить сигнал загрузки страницы
    sendMessage('PAGE_LOADED', {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now()
    });

    console.log('[ContentScript] ✅ Трекинг инициализирован');
  } catch (error) {
    console.error('[ContentScript] Критическая ошибка инициализации:', error);
  }
}