/**
 * Popup Script - Компактный UI для анализа графов (400x600px)
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
 * Инициализировать Canvas
 */
function initCanvas() {
  canvas = document.getElementById('graphCanvas');
  if (!canvas) return;

  // Отрендерить канвас с действительным размером
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  ctx = canvas.getContext('2d');
  
  // Нарисовать приветственную скрину
  drawEmptyGraph();
  
  // 🖱️ Обработка мыши
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
}

/**
 * 🎉 Обработка зума колёсиком мыши
 */
function handleWheel(e) {
  if (!canvas) return;
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const zoomFactor = 1.1;
  const newScale = e.deltaY > 0 
    ? viewState.scale / zoomFactor 
    : viewState.scale * zoomFactor;
  
  viewState.scale = Math.max(viewState.minScale, Math.min(viewState.maxScale, newScale));
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
 * 🖱️ Перемещение
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
 * 🎫 Нарисовать пустой граф
 */
function drawEmptyGraph() {
  if (!ctx || !canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  // Очистить
  ctx.clearRect(0, 0, w, h);
  
  // Сетка
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
  
  // Сообщение
  ctx.fillStyle = '#9ca3af';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔍 Эвентов нет', w / 2, h / 2);
}

/**
 * 🎫 Нарисовать граф
 */
function drawGraph() {
  if (!ctx || !canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  // Очистить
  ctx.clearRect(0, 0, w, h);
  
  // Охранить контекст
  ctx.save();
  ctx.translate(viewState.offsetX, viewState.offsetY);
  ctx.scale(viewState.scale, viewState.scale);
  
  // Прорисовать рёбра с градиентом
  graphData.edges.forEach(edge => {
    const source = nodePositions.get(edge.source);
    const target = nodePositions.get(edge.target);
    
    if (source && target) {
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
      
      // Стрелка
      drawArrow(source.x, source.y, target.x, target.y);
    }
  });
  
  // Нарисовать ноды с градиентом
  graphData.nodes.forEach((node, idx) => {
    const pos = nodePositions.get(node.id);
    if (pos) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      const nodeGradient = ctx.createRadialGradient(pos.x - 5, pos.y - 5, 0, pos.x, pos.y, 12);
      nodeGradient.addColorStop(0, '#22d3ee');
      nodeGradient.addColorStop(0.7, '#06b6d4');
      nodeGradient.addColorStop(1, '#0891b2');
      
      ctx.fillStyle = nodeGradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.shadowColor = 'transparent';
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = (node.label || node.id).substring(0, 2);
      ctx.fillText(label, pos.x, pos.y);
    }
  });
  
  ctx.restore();
  
  // Масштаб
  drawZoomInfo();
}

/**
 * 📊 Масштаб
 */
function drawZoomInfo() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`🔍 ${Math.round(viewState.scale * 100)}%`, 8, 8);
}

/**
 * 📊 Стрелка ребра
 */
function drawArrow(fromX, fromY, toX, toY) {
  if (!ctx) return;
  
  const headlen = 10;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  
  const endX = toX - 12 * Math.cos(angle);
  const endY = toY - 12 * Math.sin(angle);
  
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
  ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
  ctx.beginPath();
  ctx.moveTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX, endY);
  ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.fill();
}

/**
 * 🎯 Открыть ноды
 */
function layoutNodes() {
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  
  const nodeCount = graphData.nodes.length;
  const radius = Math.min(w, h) / 2.8 * Math.sqrt(nodeCount) / Math.max(2, nodeCount);
  
  graphData.nodes.forEach((node, index) => {
    const angle = (index / Math.max(nodeCount, 1)) * Math.PI * 2;
    const radiusOffset = radius * (0.8 + 0.2 * Math.sin(index));
    
    const x = centerX + radiusOffset * Math.cos(angle);
    const y = centerY + radiusOffset * Math.sin(angle);
    
    nodePositions.set(node.id, { x, y });
  });
  
  autoFitGraph();
  drawGraph();
}

/**
 * 📀 Автоматическое масштабирование
 */
function autoFitGraph() {
  if (!canvas || nodePositions.size === 0) return;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  nodePositions.forEach(pos => {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  });
  
  const padding = 30;
  const graphWidth = maxX - minX + padding * 2;
  const graphHeight = maxY - minY + padding * 2;
  
  const scaleX = canvas.width / graphWidth;
  const scaleY = canvas.height / graphHeight;
  viewState.scale = Math.min(scaleX, scaleY, 1) * 0.9;
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  viewState.offsetX = centerX - ((minX + maxX) / 2) * viewState.scale;
  viewState.offsetY = centerY - ((minY + maxY) / 2) * viewState.scale;
}

/**
 * Обновить граф
 */
function updateGraph(data) {
  graphData = data || { nodes: [], edges: [] };
  nodePositions.clear();
  
  viewState.scale = 1;
  viewState.offsetX = 0;
  viewState.offsetY = 0;
  
  if (graphData.nodes.length === 0) {
    drawEmptyGraph();
  } else {
    layoutNodes();
  }
  
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
  }
}

/**
 * ✅ АНАЛИЗИРОВАТЬ ТЕКУЩУЮ СЕССИЮ
 */
function analyzeCurrentSession() {
  console.log('[Popup] Нажата кнопка анализа');
  
  // Читаю из chrome.storage.local
  chrome.storage.local.get(['currentSession', 'sessionEvents'], function(result) {
    console.log('[Popup] Из storage:', result.sessionEvents?.length || 0, 'событий');
    
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
    
    // Если нет в storage
    chrome.runtime.sendMessage(
      { type: 'GET_CURRENT_SESSION' },
      function(response) {
        console.log('[Popup] Ответ от background:', response);
        
        if (!response || !response.session) {
          console.log('[Popup] Нет данных');
          document.getElementById('eventCount').textContent = '0';
          return;
        }
        
        const session = response.session;
        console.log('[Popup] Получено', session.eventCount, 'событий');
        
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
  document.getElementById('nodeCount').textContent = eventCount || 0;
  document.getElementById('edgeCount').textContent = Math.max(0, (eventCount || 0) - 1);
  
  // Нарисовать граф
  if (session.events && session.events.length > 0) {
    const nodes = [];
    const edges = [];
    const uniqueTypes = new Set();
    
    session.events.forEach((event, idx) => {
      const type = event.type || 'unknown';
      uniqueTypes.add(type);
      
      if (!nodes.find(n => n.id === type)) {
        nodes.push({ id: type, label: type });
      }
      
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
  
  // Обновить метрики
  if (session.events?.length > 0) {
    const variety = (new Set(session.events.map(e => e.type)).size / session.events.length).toFixed(2);
    document.getElementById('metricPathVariety').textContent = variety;
    document.getElementById('metricComplexCycles').textContent = session.events.length > 5 ? 'Да' : 'Нет';
  }
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
    
    chrome.storage.local.set({
      'currentSession': null,
      'sessionEvents': []
    });
    
    drawEmptyGraph();
    
    document.getElementById('nodeCount').textContent = '0';
    document.getElementById('edgeCount').textContent = '0';
    document.getElementById('eventCount').textContent = '0';
    document.getElementById('metricPathVariety').textContent = '0.00';
    document.getElementById('metricComplexCycles').textContent = 'Нет';
  }
}

/**
 * Автоматический анализ
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
    console.log('[Popup] Лоадинг...');
    
    // Отрендерить Canvas
    initCanvas();

    // Обычные события
    document.getElementById('btnAnalyze')?.addEventListener('click', analyzeCurrentSession);
    document.getElementById('btnExport')?.addEventListener('click', exportData);
    document.getElementById('btnClear')?.addEventListener('click', clearData);

    // Каждые 500мс анализируем
    startAutoAnalyze();
    
    // Остановить popup
    window.addEventListener('beforeunload', stopAutoAnalyze);
    
    document.getElementById('status').textContent = 'Ок ек (📊' + (canvas?.width || 'N/A') + 'x' + (canvas?.height || 'N/A') + 'px)';
    
    console.log('[Popup] ✅ Компактный интерфейс 400x600px готов');
  } catch (error) {
    console.error('Ошибка инициализации:', error);
  }
});
