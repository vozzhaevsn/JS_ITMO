/**
 * Background Service Worker
 * Управляет графом, обрабатывает сообщения от content script, хранит данные
 */

let graph = null;
let currentSession = null;
let sessionTimeout = null;

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 минут

// Инициализировать граф при загрузке
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[background.js] Extension installed');
  const data = await chrome.storage.local.get(['graphData']);
  if (data.graphData) {
    // Восстановить граф из хранилища
    graph = new BehaviorGraph();
    graph.fromJSON(data.graphData);
  } else {
    graph = new BehaviorGraph();
  }
});

// Слушать сообщения от content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ADD_EVENT') {
    if (!graph) graph = new BehaviorGraph();
    processEvent(request.payload, sender.tab.id, request.sessionId);
    sendResponse({ status: 'processed' });
  } else if (request.type === 'GET_GRAPH') {
    sendResponse({ data: graph ? graph.toJSON() : null });
  }
});

/**
 * Обработать событие
 */
function processEvent(event, tabId, sessionId) {
  if (!graph) graph = new BehaviorGraph();
  if (!currentSession || currentSession.id !== sessionId) {
    currentSession = {
      id: sessionId,
      tabId: tabId,
      timestamp: Date.now(),
      path: [],
      events: []
    };
  }

  if (sessionTimeout) clearTimeout(sessionTimeout);

  const nodeId = event.target.selector || event.url;
  
  if (currentSession.path.length === 0 || currentSession.path[currentSession.path.length - 1] !== nodeId) {
    currentSession.path.push(nodeId);
    
    if (currentSession.path.length > 1) {
      const prevNodeId = currentSession.path[currentSession.path.length - 2];
      graph.addEdge(prevNodeId, nodeId);
    }
    
    graph.addNode(nodeId, { label: event.target.text || nodeId });
  }

  currentSession.events.push(event);

  sessionTimeout = setTimeout(() => {
    endSession();
  }, SESSION_TIMEOUT);

  // Сохранить граф
  chrome.storage.local.set({
    graphData: graph.toJSON()
  });
}

/**
 * Завершить сессию
 */
function endSession() {
  if (currentSession && graph) {
    graph.sessions.push(currentSession);
    currentSession = null;
    // Сохранить обновленный граф
    chrome.storage.local.set({
      graphData: graph.toJSON()
    });
  }
}

// Сохранять граф каждые 5 минут
setInterval(() => {
  if (graph) {
    chrome.storage.local.set({
      graphData: graph.toJSON()
    });
  }
}, 5 * 60 * 1000);

console.log('[background.js] Service Worker initialized');
