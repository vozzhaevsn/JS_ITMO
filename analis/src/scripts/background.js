/**
 * Background Script (Service Worker) - MV3
 * Ответствен за: обработка событий, пракси, фоновые анализы
 */

console.log('[BackgroundScript] Нагружен');

// Глобальное хранилище сессий
const activeSessions = new Map();
const analyzedSessions = [];

/**
 * Листенер послания от контент-скрипта
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab.id;
  const url = sender.tab.url;

  console.log(`[BackgroundScript] Получен: ${request.type}`);

  switch (request.type) {
    case 'PAGE_LOADED':
      handlePageLoaded(tabId, url, request.data);
      break;

    case 'RECORD_EVENT':
      handleEventRecording(tabId, request.data);
      break;

    case 'GET_SESSION_DATA':
      const sessionData = getSessionData(tabId);
      sendResponse(sessionData);
      break;

    case 'ANALYZE_SESSION':
      const analysis = analyzeSession(tabId);
      sendResponse(analysis);
      break;

    default:
      console.warn(`[BackgroundScript] Неизвестный тип: ${request.type}`);
  }
});

/**
 * Обработка загруженной страницы
 */
function handlePageLoaded(tabId, url, data) {
  if (!activeSessions.has(tabId)) {
    activeSessions.set(tabId, {
      id: `session_${tabId}_${Date.now()}`,
      tabId,
      url,
      title: data.title,
      startTime: data.timestamp,
      events: [],
      classification: null
    });
  }
  console.log(`[BackgroundScript] Новая страница: ${url}`);
}

/**
 * Обработка события
 */
function handleEventRecording(tabId, event) {
  const session = activeSessions.get(tabId);
  if (session) {
    session.events.push(event);
    console.log(`[BackgroundScript] Записано событие: ${event.type}`);
  }
}

/**
 * Получить данные сессии
 */
function getSessionData(tabId) {
  const session = activeSessions.get(tabId);
  if (!session) return null;

  return {
    id: session.id,
    eventCount: session.events.length,
    duration: Date.now() - session.startTime,
    url: session.url,
    classification: session.classification
  };
}

/**
 * Анализировать сессию
 */
function analyzeSession(tabId) {
  const session = activeSessions.get(tabId);
  if (!session) return null;

  // Основной анализ
  const eventTypes = {};
  session.events.forEach(e => {
    eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
  });

  const pathVariety = new Set(session.events.map(e => `${e.type}`)).size / session.events.length;
  const hasHoverOrScroll = session.events.some(e => e.type === 'hover' || e.type === 'scroll');

  // Простая наивная классификация
  let humanScore = 0;
  if (pathVariety > 0.4) humanScore += 0.25;
  if (hasHoverOrScroll) humanScore += 0.25;
  if (session.events.length > 10) humanScore += 0.25;
  if (Object.keys(eventTypes).length > 2) humanScore += 0.25;

  const prediction = humanScore > 0.6 ? 'HUMAN' : 'BOT';

  return {
    sessionId: session.id,
    eventCount: session.events.length,
    pathVariety: (pathVariety * 100).toFixed(2) + '%',
    eventTypes,
    prediction,
    confidence: Math.abs(humanScore - 0.5) * 2,
    score: humanScore
  };
}

/**
 * Основные события расширения
 */

// Очистка сессий при закрытии конключи

chrome.tabs.onRemoved.addListener((tabId) => {
  const session = activeSessions.get(tabId);
  if (session) {
    analyzedSessions.push(session);
    activeSessions.delete(tabId);
    console.log(`[BackgroundScript] Сессия ${session.id} сохранена`);
  }
});

// Периодическая очистка
setInterval(() => {
  console.log(`[BackgroundScript] Активных сессий: ${activeSessions.size}`);
}, 60000); // каждые минуты

console.log('[BackgroundScript] Нагружен и готов');
