/**
 * Popup Script - УИ для анализа графов
 */

let cy = null;
let currentSession = null;
let graphData = { nodes: [], edges: [] };

/**
 * Инициализация Cytoscape.js
 */
function initCytoscape() {
  const container = document.getElementById('graph');
  if (!container) return;

  cy = cytoscape({
    container: container,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#0891b2',
          'label': 'data(label)',
          'width': 30,
          'height': 30,
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': 11,
          'color': 'white'
        }
      },
      {
        selector: 'edge',
        style: {
          'line-color': '#999',
          'target-arrow-color': '#999',
          'target-arrow-shape': 'triangle',
          'width': 2,
          'opacity': 0.6,
          'curve-style': 'bezier'
        }
      },
      {
        selector: 'node:selected',
        style: { 'background-color': '#f97316' }
      }
    ],
    layout: {
      name: 'spring',
      directed: true,
      animate: true,
      animationDuration: 500
    }
  });

  // Обработчики элементов
  cy.on('click', 'node', (event) => {
    const node = event.target;
    console.log('Selected node:', node.data('label'));
  });
}

/**
 * Обновить график
 */
function updateGraph(data) {
  if (!cy) return;

  cy.elements().remove();

  const nodes = data.nodes || [];
  const edges = data.edges || [];

  nodes.forEach(node => {
    cy.add({
      data: { id: node.id, label: node.label || node.id }
    });
  });

  edges.forEach(edge => {
    cy.add({
      data: {
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target
      }
    });
  });

  cy.layout({
    name: 'spring',
    directed: true,
    animate: true
  }).run();

  // Обновить статистику
  updateStats(nodes.length, edges.length);
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
  const confidence = document.getElementById('confidence');
  const confidenceText = document.getElementById('confidenceText');

  if (!analysis) return;

  const prediction = analysis.prediction || 'UNKNOWN';
  const score = analysis.score || 0;

  badge.textContent = prediction;
  badge.className = 'class-badge ' + (prediction === 'HUMAN' ? 'human' : 'bot');

  const percent = Math.round(score * 100);
  document.querySelector('.confidence-bar').style.width = percent + '%';
  confidenceText.textContent = percent + '%';
}

/**
 * Анализировать текущую сессию
 */
function analyzeCurrentSession() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.tabs.sendMessage(
      tabId,
      { type: 'ANALYZE_SESSION' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Error:', chrome.runtime.lastError);
          return;
        }

        if (response) {
          currentSession = response;
          updateClassification(response);
          
          if (response.eventTypes) {
            updateMetrics(response);
          }
        }
      }
    );
  });
}

/**
 * Обновить метрики
 */
function updateMetrics(analysis) {
  const metricsDiv = document.getElementById('metrics');
  if (!metricsDiv || !analysis) return;

  metricsDiv.innerHTML = '';
  const metrics = [
    { label: 'Path Variety', value: analysis.pathVariety },
    { label: 'Events', value: analysis.eventCount }
  ];

  metrics.forEach(m => {
    const div = document.createElement('div');
    div.className = 'metric-item';
    div.innerHTML = `<span>${m.label}:</span><strong>${m.value}</strong>`;
    metricsDiv.appendChild(div);
  });
}

/**
 * Экспортировать данные
 */
function exportData() {
  if (!currentSession) {
    alert('Nothings to export');
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
    if (cy) cy.elements().remove();
    
    document.getElementById('nodeCount').textContent = '0';
    document.getElementById('edgeCount').textContent = '0';
    document.getElementById('eventCount').textContent = '0';
    document.getElementById('duration').textContent = '0с';
    document.getElementById('classResult').textContent = '-';
    document.getElementById('confidenceText').textContent = '-';
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
 * Инициализация оборудования
 */
document.addEventListener('DOMContentLoaded', () => {
  initCytoscape();

  // Оборудование
  document.getElementById('btnAnalyze').addEventListener('click', analyzeCurrentSession);
  document.getElementById('btnExport').addEventListener('click', exportData);
  document.getElementById('btnClear').addEventListener('click', clearData);

  // Обновлять время
  updateTime();
  setInterval(updateTime, 1000);

  // Потромить данные сессии
  analyzeCurrentSession();
});
