/**
 * Popup Script - УИ для анализа графов
 * ✨ Улучшена визуализация: зум, панорамирование, градиенты
 */

let canvas = null;
let ctx = null;
let currentSession = null;
let graphData = { nodes: [], edges: [] };
let nodePositions = new Map();

// 🎯 Состояние визуализации
let viewState = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  minScale: 0.3,
  maxScale: 3,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartOffsetX: 0,
  dragStartOffsetY: 0
};

/**
 * Инициализировать Canvas для вывода графов
 */
function initCanvas() {
  canvas = document.getElementById('graphCanvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  
  // Отрисовать приветственную скрину
  drawEmptyGraph();
  
  // 🖱️ Обработка мыши для зума и панорамирования
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
}

/**
 * 🎡 Обработка зума колёсиком мыши
 */
function handleWheel(e) {
  if (!canvas) return;
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Масштабирование
  const zoomFactor = 1.1;
  const newScale = e.deltaY > 0 
    ? viewState.scale / zoomFactor 
    : viewState.scale * zoomFactor;
  
  viewState.scale = Math.max(viewState.minScale, Math.min(viewState.maxScale, newScale));
  
  // Корректировка смещения для центрирования на точку мыши
  viewState.offsetX = mouseX - (mouseX - viewState.offsetX) * (viewState.scale / (e.deltaY > 0 ? zoomFactor : 1 / zoomFactor));
  viewState.offsetY = mouseY - (mouseY - viewState.offsetY) * (viewState.scale / (e.deltaY > 0 ? zoomFactor : 1 / zoomFactor));
  
  drawGraph();
}

/**
 * 🖱️ Начало перетаскивания
 */
function handleMouseDown(e) {
  viewState.isDragging = true;
  viewState.dragStartX = e.clientX;
  viewState.dragStartY = e.clientY;
  viewState.dragStartOffsetX = viewState.offsetX;
  viewState.dragStartOffsetY = viewState.offsetY;
}

/**
 * 🖱️ Перемещение во время перетаскивания
 */
function handleMouseMove(e) {
  if (!viewState.isDragging) return;
  
  const deltaX = e.clientX - viewState.dragStartX;
  const deltaY = e.clientY - viewState.dragStartY;
  
  viewState.offsetX = viewState.dragStartOffsetX + deltaX;
  viewState.offsetY = viewState.dragStartOffsetY + deltaY;
  
  drawGraph();
}

/**
 * 🖱️ Конец перетаскивания
 */
function handleMouseUp(e) {
  viewState.isDragging = false;
}

/**
 * 🎨 Нарисовать пустой граф
 */
function drawEmptyGraph() {
  if (!ctx || !canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  // Очистить canvas
  ctx.clearRect(0, 0, w, h);
  
  // Нарисовать сетку
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
  
  // Нарисовать сообщение
  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Событий нет. Наведитесь на страницу и выполните действия', w / 2, h / 2);
}

/**
 * 🎨 Нарисовать граф с улучшенной визуализацией
 */
function drawGraph() {
  if (!ctx || !canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  // Очистить
  ctx.clearRect(0, 0, w, h);
  
  // Сохранить контекст для преобразований
  ctx.save();
  ctx.translate(viewState.offsetX, viewState.offsetY);
  ctx.scale(viewState.scale, viewState.scale);
  
  // 🎨 Рисовать ребра с градиентом
  graphData.edges.forEach(edge => {
    const source = nodePositions.get(edge.source);
    const target = nodePositions.get(edge.target);
    
    if (source && target) {
      // Градиент для ребра
      const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.8)');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      
      // Рисовать стрелку
      drawArrow(source.x, source.y, target.x, target.y);
    }
  });
  
  // 🎨 Нарисовать узлы с градиентом и тенями
  graphData.nodes.forEach((node, idx) => {
    const pos = nodePositions.get(node.id);
    if (pos) {
      // 🌟 Тень узла
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Градиент для узла
      const nodeGradient = ctx.createRadialGradient(pos.x - 5, pos.y - 5, 0, pos.x, pos.y, 15);
      nodeGradient.addColorStop(0, '#22d3ee');
      nodeGradient.addColorStop(0.7, '#06b6d4');
      nodeGradient.addColorStop(1, '#0891b2');
      
      ctx.fillStyle = nodeGradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Обводка узла
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Отключить тень для текста
      ctx.shadowColor = 'transparent';
      
      // Лейбл
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = (node.label || node.id).substring(0, 3);
      ctx.fillText(label, pos.x, pos.y);
    }
  });
  
  ctx.restore();
  
  // 📊 Нарисовать информацию масштабирования
  drawZoomInfo();
}

/**
 * 📊 Нарисовать информацию о масштабировании
 */
function drawZoomInfo() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`🔍 ${Math.round(viewState.scale * 100)}%`, 10, 10);
}

/**
 * 🎨 Нарисовать стрелку ребра
 */
function drawArrow(fromX, fromY, toX, toY) {
  if (!ctx) return;
  
  const headlen = 12;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  
  // Рассчитать точку на окончании (без пересечения с узлом)
  const endX = toX - 15 * Math.cos(angle);
  const endY = toY - 15 * Math.sin(angle);
  
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
  ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
  ctx.beginPath();
  ctx.moveTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX, endY);
  ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.fill();
}

/**
 * 🎯 Обновить позиции узлов с адаптивным макетом
 */
function layoutNodes() {
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  
  // Адаптивный радиус в зависимости от количества узлов
  const nodeCount = graphData.nodes.length;
  const radius = Math.min(w, h) / 2.5 * Math.sqrt(nodeCount) / Math.max(2, nodeCount);
  
  // Расположить ноды по спирали для лучшей визуализации
  graphData.nodes.forEach((node, index) => {
    const angle = (index / Math.max(nodeCount, 1)) * Math.PI * 2;
    // Добавить небольшое смещение для более естественного вида
    const radiusOffset = radius * (0.8 + 0.2 * Math.sin(index));
    
    const x = centerX + radiusOffset * Math.cos(angle);
    const y = centerY + radiusOffset * Math.sin(angle);
    
    nodePositions.set(node.id, { x, y });
  });
  
  // Автоматически подобрать масштаб
  autoFitGraph();
  drawGraph();
}

/**
 * 📐 Автоматическое масштабирование графа
 */
function autoFitGraph() {
  if (!canvas || nodePositions.size === 0) return;
  
  // Найти границы графа
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  nodePositions.forEach(pos => {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  });
  
  const padding = 50;
  const graphWidth = maxX - minX + padding * 2;
  const graphHeight = maxY - minY + padding * 2;
  
  // Подобрать масштаб
  const scaleX = canvas.width / graphWidth;
  const scaleY = canvas.height / graphHeight;
  viewState.scale = Math.min(scaleX, scaleY, 1) * 0.9; // 90% от максимума
  
  // Центрировать
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  viewState.offsetX = centerX - ((minX + maxX) / 2) * viewState.scale;
  viewState.offsetY = centerY - ((minY + maxY) / 2) * viewState.scale;
}

/**
 * Обновить график
 */
function updateGraph(data) {
  graphData = data || { nodes: [], edges: [] };
  nodePositions.clear();
  
  // Сбросить состояние просмотра
  viewState.scale = 1;
  viewState.offsetX = 0;
  viewState.offsetY = 0;
  
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
 * ✅ АНАЛИЗИРОВАТЬ ТЕКУЩУЮ СЕССИЮ
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
 * Отобразить сессию
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
    // Построим граф из событий
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
 * Автоматический анализ каждые 500мс
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
    
    console.log('[Popup] ✅ Initialized with improved visualization');
  } catch (error) {
    console.error('Ошибка инициализации popup.js:', error);
  }
});
