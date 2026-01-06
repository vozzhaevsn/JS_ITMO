/**
 * Background Script (Service Worker) - MV3
 * Ответствен за: обработка событий, пракси, фоновые анализы
 */

console.log('[BackgroundScript] Нагружен');

// Глобальное хранилище сессий
const activeSessions = new Map();
const analyzedSessions = [];

// Текущая активная сессия
let currentSession = null;
let sessionEvents = [];

// ✅ ШАГИ 1-3: Инициализируем сессию при загрузке
function initializeSession() {
  currentSession = {
    id: 'session_' + Date.now(),
    startTime: Date.now(),
    url: 'loading...',
    events: [],
  };
  sessionEvents = [];
  
  // Сохраняем в chrome.storage
  chrome.storage.local.set({
    'currentSession': currentSession,
    'sessionEvents': sessionEvents
  }, function() {
    console.log('[BackgroundScript] ✅ Session инициализирована и сохранена в storage:', currentSession.id);
  });
}

// Проверяем доступ к storage
chrome.storage.local.get(null, function(items) {
  console.log('[BackgroundScript] Storage доступен:', Object.keys(items).length, 'ключей');
});

// Инициализируем при загрузке скрипта
initializeSession();

/**
 * Листенер послания от контент-скрипта
 * ✅ ШАГИ 1-2: Используем function вместо стрелки для совместимости
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  const tabId = sender.tab?.id;
  const url = sender.tab?.url;

  console.log('[BackgroundScript] Получен:', request.type);

  switch (request.type) {
    case 'PAGE_LOADED':
      handlePageLoaded(tabId, url, request.data);
      sendResponse({ success: true });
      break;

    case 'RECORD_EVENT':
      handleEventRecording(tabId, request.data);
      sendResponse({ success: true });
      break;

    case 'GET_SESSION_DATA':
      const sessionData = getSessionData(tabId);
      sendResponse(sessionData);
      break;

    case 'ANALYZE_SESSION':
      const analysis = analyzeSession(tabId);
      sendResponse(analysis);
      break;

    // ✅ ШАГИ 2-3: Обработчик GET_SESSION для popup
    case 'GET_SESSION':
    case 'GET_CURRENT_SESSION':
      console.log('[BackgroundScript] ✅ GET_SESSION запрос');
      
      // Читаем из storage для надежности
      chrome.storage.local.get(['currentSession', 'sessionEvents'], function(result) {
        const session = result.currentSession || currentSession;
        const events = result.sessionEvents || sessionEvents;
        
        const response = {
          success: true,
          session: {
            id: session.id,
            url: session.url,
            startTime: session.startTime,
            eventCount: events.length,
            events: events.slice(-100), // Последние 100 событий
          }
        };
        
        console.log('[BackgroundScript] Отправляю:', response.session.eventCount, 'событий');
        sendResponse(response);
      });
      
      // ✅ ВАЖНО: return true для асинхронных ответов
      return true;

    default:
      console.warn('[BackgroundScript] Неизвестный тип:', request.type);
  }

  return true;
});

/**
 * Обработка загруженной страницы
 */
function handlePageLoaded(tabId, url, data) {
  // Обновляем текущую сессию
  if (currentSession) {
    currentSession.url = url;
    currentSession.title = data?.title;
  }

  // Также сохраняем в activeSessions для обратной совместимости
  if (!activeSessions.has(tabId)) {
    activeSessions.set(tabId, {
      id: `session_${tabId}_${Date.now()}`,
      tabId,
      url,
      title: data?.title,
      startTime: data?.timestamp || Date.now(),
      events: [],
      classification: null
    });
  }
  
  sessionEvents = []; // Очищаем события при загрузке новой страницы
  
  // Сохраняем в storage
  chrome.storage.local.set({
    'currentSession': currentSession,
    'sessionEvents': sessionEvents
  });
  
  console.log('[BackgroundScript] PAGE_LOADED:', url);
}

/**
 * Обработка события
 * ✅ ШАГИ 2-3: Сохраняем события в chrome.storage каждые 10 событий
 */
function handleEventRecording(tabId, event) {
  // Сохраняем в currentSession
  const eventWithMetadata = {
    ...event,
    timestamp: event.timestamp || Date.now(),
    sessionId: currentSession?.id,
    tabId,
  };
  
  sessionEvents.push(eventWithMetadata);
  console.log('[BackgroundScript] RECORD_EVENT:', event.type, '- Total:', sessionEvents.length);

  // Также сохраняем в activeSessions для обратной совместимости
  const session = activeSessions.get(tabId);
  if (session) {
    session.events.push(event);
  }
  
  // ✅ Сохраняем в chrome.storage каждые 10 событий
  if (sessionEvents.length % 10 === 0) {
    chrome.storage.local.set({
      'currentSession': currentSession,
      'sessionEvents': sessionEvents
    }, function() {
      console.log('[BackgroundScript] 📝 Сохранено', sessionEvents.length, 'событий в storage');
    });
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

// Очистка сессий при закрытии вкладки
chrome.tabs.onRemoved.addListener((tabId) => {
  const session = activeSessions.get(tabId);
  if (session) {
    analyzedSessions.push(session);
    activeSessions.delete(tabId);
    console.log('[BackgroundScript] Сессия сохранена:', session.id);
  }
});

// Периодическая очистка и логирование
setInterval(() => {
  console.log('[BackgroundScript] Статус:', {
    activeSessions: activeSessions.size,
    currentSessionEvents: sessionEvents.length,
    sessionId: currentSession?.id,
  });
}, 60000); // каждые минуты

console.log('[BackgroundScript] ✅ Готов к работе');
