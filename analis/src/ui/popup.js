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
 * Анализировать текущую сессию
 */
function analyzeCurrentSession() {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.warn('Ошибка получения таба:', chrome.runtime.lastError);
        return;
      }
      
      if (!tabs || tabs.length === 0) return;
      
      const tabId = tabs[0].id;
      
      // Получить данные из background
      chrome.runtime.sendMessage(
        { type: 'GET_SESSION_DATA' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Ошибка sendMessage:', chrome.runtime.lastError);
            return;
          }

          if (response) {
            currentSession = response;
            
            // Обновить отображение
            if (response.graphData) {
              updateGraph(response.graphData);
            }
            
            if (response.analysis) {
              updateClassification(response.analysis);
            }
            
            // Обновить список событий
            if (response.events) {
              updateEventsList(response.events);
            }
          }
        }
      );
    });
  } catch (error) {
    console.warn('Ошибка analyzeCurrentSession:', error);
  }
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
  a.download = `session_${currentSession.sessionId || Date.now()}.json`;
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
 * Инициализация
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Отрисовать Canvas
    initCanvas();

    // Обычные события
    document.getElementById('btnAnalyze')?.addEventListener('click', analyzeCurrentSession);
    document.getElementById('btnExport')?.addEventListener('click', exportData);
    document.getElementById('btnClear')?.addEventListener('click', clearData);

    // Обновлять время
    updateTime();
    setInterval(updateTime, 1000);

    // Получить данные сессии
    analyzeCurrentSession();
  } catch (error) {
    console.error('Ошибка инициализации popup.js:', error);
  }
});
