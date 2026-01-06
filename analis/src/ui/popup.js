let graph = null;
let cy = null;
let detector = new BotDetector();

// Инициализировать Cytoscape
async function initCytoscape() {
  const data = await chrome.storage.local.get(['graphData']);
  
  if (data.graphData) {
    graph = new BehaviorGraph();
    graph.fromJSON(data.graphData);
  } else {
    graph = new BehaviorGraph();
  }

  // Подготовить элементы для Cytoscape
  const elements = [];

  // Добавить узлы
  graph.nodes.forEach((node) => {
    elements.push({
      data: {
        id: node.id,
        label: node.label || node.id,
        visits: node.visits,
        pageRank: (node.pageRank * 100).toFixed(1)
      },
      style: {
        'background-color': '#667eea',
        'width': Math.min(40 + node.visits * 2, 100),
        'height': Math.min(40 + node.visits * 2, 100)
      }
    });
  });

  // Добавить ребра
  graph.edges.forEach((edge, key) => {
    elements.push({
      data: {
        id: key,
        source: edge.source,
        target: edge.target,
        weight: edge.weight.toFixed(2)
      },
      style: {
        'stroke-width': Math.min(1 + edge.weight * 0.5, 5),
        'opacity': Math.min(0.3 + edge.count * 0.1, 1)
      }
    });
  });

  cy = cytoscape({
    container: document.getElementById('cy'),
    elements: elements,
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'white',
          'font-size': 11,
          'border-width': 2,
          'border-color': '#764ba2',
          'background-opacity': 0.9
        }
      },
      {
        selector: 'edge',
        style: {
          'curve-style': 'bezier',
          'target-arrow-shape': 'triangle',
          'target-arrow-color': '#667eea',
          'line-color': '#667eea',
          'arrow-scale': 1.2
        }
      }
    ],
    layout: {
      name: 'cose',
      directed: true,
      nodeSpacing: 10,
      edgeLengthVal: 200,
      animate: true,
      animationDuration: 500
    }
  });

  updateStats();
  updateSessionsList();
}

/**
 * Обновить статистику
 */
function updateStats() {
  if (!graph) return;
  
  document.getElementById('nodeCount').textContent = graph.nodes.size;
  document.getElementById('edgeCount').textContent = graph.edges.size;
  document.getElementById('sessionCount').textContent = graph.sessions.length;

  const cycles = graph.detectCycles();
  document.getElementById('cycleCount').textContent = cycles.length;

  // Классификация
  if (graph.sessions.length > 0) {
    const classification = detector.classifyBatch(graph.sessions);
    document.getElementById('classHuman').textContent = `👤 Human: ${classification.summary.humanPercentage}`;
    document.getElementById('classBot').textContent = `🤖 Bot: ${classification.summary.bots > 0 ? (classification.summary.bots / classification.summary.total * 100).toFixed(2) : '0'}%`;
  }
}

/**
 * Обновить список сессий
 */
function updateSessionsList() {
  if (!graph) return;
  
  const listEl = document.getElementById('sessionsList');
  listEl.innerHTML = '';

  graph.sessions.slice(-5).forEach((session, idx) => {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.innerHTML = `<strong>Session ${idx + 1}</strong><br>
                      ${session.path.length} переходов<br>
                      ${new Date(session.timestamp).toLocaleTimeString()}`;
    item.addEventListener('click', () => highlightSession(session));
    listEl.appendChild(item);
  });
}

/**
 * Выделить сессию
 */
function highlightSession(session) {
  if (cy) {
    cy.elements().style('opacity', 0.3);
    
    session.path.forEach((nodeId) => {
      cy.getElementById(nodeId).style('opacity', 1);
    });
  }
}

// Event Listeners
document.getElementById('layoutBtn')?.addEventListener('click', () => {
  if (cy) {
    cy.layout({ name: 'cose', directed: true, animate: true }).run();
  }
});

document.getElementById('zoomFit')?.addEventListener('click', () => {
  if (cy) cy.fit();
});

document.getElementById('centerView')?.addEventListener('click', () => {
  if (cy) cy.center();
});

document.getElementById('exportBtn')?.addEventListener('click', () => {
  if (graph) {
    const json = JSON.stringify(graph.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
});

document.getElementById('clearBtn')?.addEventListener('click', () => {
  if (confirm('Очистить все данные?')) {
    graph = new BehaviorGraph();
    chrome.storage.local.remove(['graphData']);
    location.reload();
  }
});

document.getElementById('analyzeBtn')?.addEventListener('click', () => {
  if (graph) {
    const metrics = graph.computeAllMetrics();
    const cycles = graph.detectCycles();
    const pageRanks = graph.computePageRank();

    alert(`Анализ завершен:
- Циклов найдено: ${cycles.length}
- Средняя длина цикла: ${cycles.length > 0 ? (cycles.reduce((a, b) => a + b.length, 0) / cycles.length).toFixed(2) : 0}
- Время вычисления: ${metrics.computeTime.toFixed(2)}ms
- Узлы с высоким PageRank: ${Array.from(pageRanks.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, rank]) => `${id} (${(rank * 100).toFixed(1)}%)`)
        .join(', ')}`);
  }
});

// Слушать обновления данных
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.graphData) {
    initCytoscape();
  }
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initCytoscape);
