/**
 * Мониторинг изменений DOM
 * Отслеживает: добавление/удаление элементов, чтение/исправление
 */

class DOMTracker {
  constructor(sessionTracker, config = {}) {
    this.sessionTracker = sessionTracker;
    this.observer = null;
    this.config = {
      trackAttributes: true,
      trackChildList: true,
      trackCharacterData: true,
      trackSubtree: true,
      debounceTime: 500,
      ...config
    };
    this.isEnabled = false;
    this.domChangeTimeout = null;
    this.mutationCount = 0;
  }

  /**
   * Включить мониторинг
   */
  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;

    const options = {
      attributes: this.config.trackAttributes,
      childList: this.config.trackChildList,
      characterData: this.config.trackCharacterData,
      subtree: this.config.trackSubtree
    };

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body || document.documentElement, options);
    console.log('[DOMTracker] Мониторинг включен');
  }

  /**
   * Отключить мониторинг
   */
  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    clearTimeout(this.domChangeTimeout);
    console.log('[DOMTracker] Мониторинг отключен');
  }

  /**
   * Обработка мутаций DOM
   */
  handleMutations(mutations) {
    // Debounce: не отправлять каждую мутацию отдельно
    clearTimeout(this.domChangeTimeout);

    this.domChangeTimeout = setTimeout(() => {
      const changes = this.processMutations(mutations);
      
      if (changes.length > 0) {
        const event = {
          type: 'dom_change',
          timestamp: Date.now(),
          changes,
          mutationCount: changes.length
        };

        this.sessionTracker.recordEvent(event);
      }
    }, this.config.debounceTime);
  }

  /**
   * Анализировать мутации
   */
  processMutations(mutations) {
    const changes = [];
    const processedTargets = new Set();

    mutations.forEach((mutation) => {
      const targetKey = `${mutation.type}:${mutation.target.tagName}`;
      
      // Не процессировать однотипные чангес
      if (processedTargets.has(targetKey)) return;
      processedTargets.add(targetKey);

      switch (mutation.type) {
        case 'childList':
          changes.push({
            type: 'child_list',
            target: mutation.target.tagName,
            addedNodes: mutation.addedNodes.length,
            removedNodes: mutation.removedNodes.length
          });
          break;

        case 'attributes':
          changes.push({
            type: 'attribute',
            target: mutation.target.tagName,
            attribute: mutation.attributeName,
            oldValue: mutation.oldValue,
            newValue: mutation.target.getAttribute(mutation.attributeName)
          });
          break;

        case 'characterData':
          changes.push({
            type: 'character_data',
            target: mutation.target.parentElement?.tagName || 'unknown',
            oldValue: mutation.oldValue,
            newValue: mutation.target.nodeValue
          });
          break;
      }
    });

    return changes;
  }

  /**
   * Получить количество элементов в DOM
   */
  getElementCount() {
    return document.querySelectorAll('*').length;
  }

  /**
   * Получить инфо о дереве DOM
   */
  getDOMStats() {
    const elements = document.querySelectorAll('*');
    const tagNames = {};

    elements.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      tagNames[tag] = (tagNames[tag] || 0) + 1;
    });

    return {
      totalElements: elements.length,
      tagDistribution: tagNames,
      depth: this.calculateDepth(document.documentElement)
    };
  }

  /**
   * Вычислить глубину DOM
   */
  calculateDepth(element, depth = 0) {
    if (!element.children.length) return depth;
    
    let maxDepth = depth;
    for (let child of element.children) {
      const childDepth = this.calculateDepth(child, depth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
    
    return maxDepth;
  }

  /**
   * Получить количество мутаций
   */
  getMutationCount() {
    return this.mutationCount;
  }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMTracker;
}
