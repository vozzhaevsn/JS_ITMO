/**
 * Управление IndexedDB
 * Сохранение: сессии, графы, настройки
 */

class IndexedDBManager {
  constructor(dbName = 'BehaviorGraphDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.isOpen = false;
  }

  /**
   * Открыть или создать базу данных
   */
  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[IndexedDBManager] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isOpen = true;
        console.log('[IndexedDBManager] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        this.createObjectStores(db);
      };
    });
  }

  /**
   * Создать основные object stores
   */
  createObjectStores(db) {
    // Хранилище сессий
    if (!db.objectStoreNames.contains('sessions')) {
      const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
      sessionStore.createIndex('startTime', 'startTime', { unique: false });
      sessionStore.createIndex('classification', 'classification', { unique: false });
    }

    // Хранилище графов
    if (!db.objectStoreNames.contains('graphs')) {
      const graphStore = db.createObjectStore('graphs', { keyPath: 'id' });
      graphStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // Хранилище метрик
    if (!db.objectStoreNames.contains('metrics')) {
      const metricsStore = db.createObjectStore('metrics', { keyPath: 'id' });
      metricsStore.createIndex('sessionId', 'sessionId', { unique: false });
    }

    // Настройки
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' });
    }
  }

  /**
   * Сохранить сессию
   */
  async saveSession(session) {
    if (!this.isOpen) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      const request = store.put(session);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[IndexedDBManager] Session ${session.id} saved`);
        resolve(session.id);
      };
    });
  }

  /**
   * Получить сессию по ID
   */
  async getSession(sessionId) {
    if (!this.isOpen) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.get(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Получить все сессии
   */
  async getAllSessions() {
    if (!this.isOpen) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Удалить сессию
   */
  async deleteSession(sessionId) {
    if (!this.isOpen) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      const request = store.delete(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[IndexedDBManager] Session ${sessionId} deleted`);
        resolve(true);
      };
    });
  }

  /**
   * Сохранить граф
   */
  async saveGraph(graph) {
    if (!this.isOpen) await this.open();

    const graphData = {
      id: graph.id || `graph_${Date.now()}`,
      data: graph,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['graphs'], 'readwrite');
      const store = transaction.objectStore('graphs');
      const request = store.put(graphData);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[IndexedDBManager] Graph ${graphData.id} saved`);
        resolve(graphData.id);
      };
    });
  }

  /**
   * Получить граф по ID
   */
  async getGraph(graphId) {
    if (!this.isOpen) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['graphs'], 'readonly');
      const store = transaction.objectStore('graphs');
      const request = store.get(graphId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.data);
    });
  }

  /**
   * Получить статистику
   */
  async getStats() {
    if (!this.isOpen) await this.open();

    const sessionCount = await this.countRecords('sessions');
    const graphCount = await this.countRecords('graphs');

    return {
      sessions: sessionCount,
      graphs: graphCount,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Посчитать количество записей
   */
  async countRecords(storeName) {
    if (!this.isOpen) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Очистить все данные
   */
  async clear() {
    if (!this.isOpen) await this.open();

    const stores = ['sessions', 'graphs', 'metrics', 'settings'];

    for (const storeName of stores) {
      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }

    console.log('[IndexedDBManager] All data cleared');
  }

  /**
   * Очистить старые сессии
   */
  async clearOldSessions(daysOld = 30) {
    if (!this.isOpen) await this.open();

    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const sessions = await this.getAllSessions();
    const toDelete = sessions.filter(s => s.startTime < cutoffDate);

    for (const session of toDelete) {
      await this.deleteSession(session.id);
    }

    console.log(`[IndexedDBManager] Deleted ${toDelete.length} old sessions`);
    return toDelete.length;
  }

  /**
   * Закрыть базу
   */
  close() {
    if (this.db) {
      this.db.close();
      this.isOpen = false;
      console.log('[IndexedDBManager] Database closed');
    }
  }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IndexedDBManager;
}
