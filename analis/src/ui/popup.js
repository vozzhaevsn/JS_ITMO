/**
 * Popup Script - УИ для анализа графов
 * Оптимизировано для Comet: Canvas без CDN
 */

let canvas = null;
let ctx = null;
let currentSession = null;
let graphData = { nodes: [], edges: [] };
let nodePositions = new Map();

/**
 * Инициализировать Canvas для вывода графов
 */
function initCanvas() {
  canvas = document.getElementById('graphCanvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  
  // Отрисовать приветственную скрину
  drawEmptyGraph();
  
  // Обработка наведения для интерактивности
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('click', handleCanvasClick);
}

/**
 * Нарисовать пустой граф
 */
function drawEmptyGraph() {
  if (!ctx || !canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  // Очистить canvas
  ctx.clearRect(0, 0, w, h);
  
  // Нарисовать сетку (попеременные линии)
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;
  
  for (let i = 0; i < w; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }
  
  for (let i = 0; i < h; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(w, i);
    ctx.stroke();
  }
  
  // Нарисовать строку "событий нет"
  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Событий нет. Наведитесь на страницу и выполните действия', w / 2, h / 2);
}

/**
 * Нарисовать граф в Canvas
 */
function drawGraph() {
  if (!ctx || !canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  // Очистить
  ctx.clearRect(0, 0, w, h);
  
  // Рнисовать ребра
  graphData.edges.forEach(edge => {
    const source = nodePositions.get(edge.source);
    const target = nodePositions.get(edge.target);
    
    if (source && target) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      
      // Рисовать стрелку
      drawArrow(source.x, source.y, target.x, target.y);
    }
  });
  
  // Нарисовать узлы
  graphData.nodes.forEach(node => {
    const pos = nodePositions.get(node.id);
    if (pos) {
      // Круг
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Лейбла
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = (node.label || node.id).substring(0, 3);
      ctx.fillText(label, pos.x, pos.y);
    }
  });
}

/**
 * Нарисовать стрелку ребра
 */
function drawArrow(fromX, fromY, toX, toY) {
  if (!ctx) return;
  
  const headlen = 15;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  
  ctx.strokeStyle = '#cbd5e1';
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.fill();
}

/**
 * Обновить позиции узлов (simple layout)
 */
function layoutNodes() {
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  const radius = Math.min(w, h) / 3;
  
  // Расположить ноды по кругу
  graphData.nodes.forEach((node, index) => {
    const angle = (index / Math.max(graphData.nodes.length, 1)) * Math.PI * 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    nodePositions.set(node.id, { x, y });
  });
  
  // Нарисовать граф
  drawGraph();
}

/**
 * Обновить график
 */
function updateGraph(data) {
  graphData = data || { nodes: [], edges: [] };
  nodePositions.clear();
  
  if (graphData.nodes.length === 0) {
    drawEmptyGraph();
  } else {
    layoutNodes();
  }
  
  // Обновить статистику
  updateStats(graphData.nodes.length, graphData.edges.length);
}

/**
 * Обновить статистику
 */
function updateStats(nodeCount, edgeCount) {
  document.getElementById('nodeCount').textContent = nodeCount;
  document.getElementById('edgeCount').textContent = edgeCount;

  if (currentSession) {
    document.getElementById('eventCount').textContent = currentSession.eventCount || 0;

    const duration = currentSession.duration || 0;
    const seconds = Math.round(duration / 1000);
    document.getElementById('duration').textContent = seconds + 'с';
  }
}

/**
 * Обновить классификацию
 */
function updateClassification(analysis) {
  const badge = document.getElementById('classResult');
  const confidenceText = document.getElementById('confidenceText');

  if (!analysis) return;

  const prediction = analysis.prediction || 'UNKNOWN';
  const score = analysis.score || 0;

  badge.textContent = prediction;
  badge.className = 'class-badge ' + (prediction === 'HUMAN' ? 'human' : 'bot');

  const percent = Math.round(score * 100);
  document.querySelector('#confidence .confidence-bar').style.width = percent + '%';
  confidenceText.textContent = percent + '%';
  
  // Обновить метрики
  if (analysis.pathVariety !== undefined) {
    document.getElementById('metricPathVariety').textContent = analysis.pathVariety.toFixed(2);
  }
  if (analysis.averageTiming !== undefined) {
    document.getElementById('metricAvgTiming').textContent = Math.round(analysis.averageTiming) + 'мс';
  }
  if (analysis.variance !== undefined) {
    document.getElementById('metricVariance').textContent = analysis.variance.toFixed(2);
  }
  if (analysis.hasComplexCycles !== undefined) {
    document.getElementById('metricComplexCycles').textContent = analysis.hasComplexCycles ? 'Да' : 'Нет';
  }
}

/**
 * ✅ ШАГИ 2-3: АНАЛИЗИРОВАТЬ ТЕКУЩУЮ СЕССИЮ (ОБНОВЛЕННАЯ)
 * Читает из chrome.storage.local и обрабатывает асинхронные ответы
 */
function analyzeCurrentSession() {
  console.log('[Popup] Кнопка анализа нажата');
  
  // Сначала читаем из chrome.storage.local
  chrome.storage.local.get(['currentSession', 'sessionEvents'], function(result) {
    console.log('[Popup] Из storage получено:', result.sessionEvents?.length || 0, 'событий');
    
    // Если есть в storage - используем эти данные
    if (result.sessionEvents && result.sessionEvents.length > 0) {
      const events = result.sessionEvents;
      const session = result.currentSession || {};
      
      currentSession = {
        id: session.id || 'unknown',
        url: session.url || 'N/A',
        startTime: session.startTime,
        eventCount: events.length,
        events: events,
        duration: Date.now() - (session.startTime || 0)
      };
      
      console.log('[Popup] Из storage:', currentSession.eventCount, 'событий');
      updateSessionDisplay(currentSession);
      return;
    }
    
    // Если нет в storage, запрашиваем у background script
    chrome.runtime.sendMessage(
      { type: 'GET_CURRENT_SESSION' },
      function(response) {
        console.log('[Popup] Ответ от background:', response);
        
        if (!response || !response.session) {
          console.log('[Popup] Нет данных сессии');
          document.getElementById('eventCount').textContent = '0';
          return;
        }
        
        const session = response.session;
        console.log('[Popup] Получено', session.eventCount, 'событий');
        
        // Сохраняем сессию
        currentSession = session;
        updateSessionDisplay(currentSession);
      }
    );
  });
}

/**
 * ✅ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Отобразить сессию
 */
function updateSessionDisplay(session) {
  if (!session) return;
  
  const eventCount = session.eventCount || session.events?.length || 0;
  document.getElementById('eventCount').textContent = eventCount;
  
  // Отображаем информацию сессии
  const sessionInfo = document.getElementById('sessionInfo');
  if (sessionInfo) {
    sessionInfo.innerHTML = `
      <div style="font-size: 11px; color: #666;">
        <p><strong>Session:</strong> ${session.id?.substring(0, 16) || 'unknown'}...</p>
        <p><strong>URL:</strong> ${session.url || 'N/A'}</p>
        <p><strong>Events:</strong> ${eventCount}</p>
      </div>
    `;
  }
  
  // Основные метрики
  document.getElementById('nodeCount').textContent = eventCount || 0;
  document.getElementById('edgeCount').textContent = Math.max(0, (eventCount || 0) - 1);
  
  // Если есть events - нарисовать граф
  if (session.events && session.events.length > 0) {
    // Построим простой граф из событий
    const nodes = [];
    const edges = [];
    const uniqueTypes = new Set();
    
    session.events.forEach((event, idx) => {
      const type = event.type || 'unknown';
      uniqueTypes.add(type);
      
      // Ноды - типы событий
      if (!nodes.find(n => n.id === type)) {
        nodes.push({ id: type, label: type });
      }
      
      // Ребра - переходы
      if (idx > 0) {
        const prevType = session.events[idx - 1].type || 'unknown';
        if (prevType !== type) {
          edges.push({ source: prevType, target: type });
        }
      }
    });
    
    updateGraph({ nodes, edges });
  } else {
    drawEmptyGraph();
  }
  
  // Обновить список событий
  updateEventsList(session.events);
}

/**
 * Обновить список событий
 */
function updateEventsList(events) {
  const eventsList = document.getElementById('eventsList');
  if (!eventsList) return;
  
  eventsList.innerHTML = '';
  
  if (!events || events.length === 0) {
    eventsList.innerHTML = '<p style="color: #999; font-size: 12px; padding: 10px;"> Событий нет</p>';
    return;
  }
  
  // Показать последние 10 событий
  const recentEvents = events.slice(-10).reverse();
  
  recentEvents.forEach(event => {
    const div = document.createElement('div');
    div.style.fontSize = '12px';
    div.style.padding = '5px';
    div.style.borderBottom = '1px solid #e5e7eb';
    div.textContent = `${event.type} → ${event.selector || 'page'}`;
    eventsList.appendChild(div);
  });
}

/**
 * Обработка движения мыши на Canvas
 */
function handleCanvasMouseMove(e) {
  // На основании этого можно добавить наведение и тоолтипы
}

/**
 * Обработка клика на Canvas
 */
function handleCanvasClick(e) {
  // На основании этого можно выбрать узлы
}

/**
 * Экспортировать данные
 */
function exportData() {
  if (!currentSession) {
    alert('Нет данных для экспорта');
    return;
  }

  const jsonData = JSON.stringify(currentSession, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session_${currentSession.id || Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Очистить данные
 */
function clearData() {
  if (confirm('Очистить все данные?')) {
    currentSession = null;
    graphData = { nodes: [], edges: [] };
    nodePositions.clear();
    
    // Также очищаем из storage
    chrome.storage.local.set({
      'currentSession': null,
      'sessionEvents': []
    });
    
    drawEmptyGraph();
    
    document.getElementById('nodeCount').textContent = '0';
    document.getElementById('edgeCount').textContent = '0';
    document.getElementById('eventCount').textContent = '0';
    document.getElementById('duration').textContent = '0с';
    document.getElementById('classResult').textContent = '-';
    document.getElementById('confidenceText').textContent = '-';
    document.getElementById('eventsList').innerHTML = '';
  }
}

/**
 * Обновить время
 */
function updateTime() {
  const now = new Date();
  const time = now.toLocaleTimeString('ru-RU');
  document.getElementById('time').textContent = time;
}

/**
 * Каждые 500мс автоматически анализируем
 */
let autoAnalyzeInterval = null;

function startAutoAnalyze() {
  if (autoAnalyzeInterval) return;
  autoAnalyzeInterval = setInterval(() => {
    analyzeCurrentSession();
  }, 500);
}

function stopAutoAnalyze() {
  if (autoAnalyzeInterval) {
    clearInterval(autoAnalyzeInterval);
    autoAnalyzeInterval = null;
  }
}

/**
 * Инициализация
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('[Popup] Loading...');
    
    // Отрисовать Canvas
    initCanvas();

    // Обычные события
    document.getElementById('btnAnalyze')?.addEventListener('click', analyzeCurrentSession);
    document.getElementById('btnExport')?.addEventListener('click', exportData);
    document.getElementById('btnClear')?.addEventListener('click', clearData);

    // Обновлять время
    updateTime();
    setInterval(updateTime, 1000);

    // Каждые 500мс анализируем
    startAutoAnalyze();
    
    // Остановить автоматик если popup закрылся
    window.addEventListener('beforeunload', stopAutoAnalyze);
    
    console.log('[Popup] ✅ Initialized');
  } catch (error) {
    console.error('Ошибка инициализации popup.js:', error);
  }
});
