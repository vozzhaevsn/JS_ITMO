// ================================================
// BEHAVIOR GRAPH ANALYZER - POPUP SCRIPT
// ================================================

console.log('[Popup] Popup script loaded');

// ─────────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────────

const elements = {
  // Buttons
  analyzeBtn: document.getElementById('analyzeBtn'),
  clearBtn: document.getElementById('clearBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  exportPngBtn: document.getElementById('exportPngBtn'),

  // Info elements
  sessionId: document.getElementById('sessionId'),
  pageUrl: document.getElementById('pageUrl'),
  eventCount: document.getElementById('eventCount'),
  sessionTime: document.getElementById('sessionTime'),

  // Cards
  metricsCard: document.getElementById('metricsCard'),
  graphCard: document.getElementById('graphCard'),
  statsCard: document.getElementById('statsCard'),
  exportActions: document.getElementById('exportActions'),

  // Metrics
  nodeCount: document.getElementById('nodeCount'),
  edgeCount: document.getElementById('edgeCount'),
  avgDegree: document.getElementById('avgDegree'),
  graphDensity: document.getElementById('graphDensity'),

  // Canvas
  graphCanvas: document.getElementById('graphCanvas'),
  canvasInfo: document.getElementById('canvasInfo'),
  eventStats: document.getElementById('eventStats'),

  // Status
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  success: document.getElementById('success'),
};

// ─────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────

let currentSession = null;
let currentEvents = [];
let currentGraph = null;
let updateTimer = null;

// ─────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────

function init() {
  console.log('[Popup] Initializing popup');
  
  // Load initial session data
  loadSessionData();
  
  // Setup event listeners
  setupEventListeners();
  
  // Auto-update session info every second
  updateTimer = setInterval(updateSessionInfo, 1000);
  
  console.log('[Popup] ✅ Popup initialized');
}

// ─────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────

function setupEventListeners() {
  elements.analyzeBtn.addEventListener('click', handleAnalyzeClick);
  elements.clearBtn.addEventListener('click', handleClearClick);
  elements.exportJsonBtn.addEventListener('click', () => exportData('json'));
  elements.exportCsvBtn.addEventListener('click', () => exportData('csv'));
  elements.exportPngBtn.addEventListener('click', () => exportData('png'));
}

// ─────────────────────────────────────────────────
// Session Data Loading
// ─────────────────────────────────────────────────

function loadSessionData() {
  console.log('[Popup] Loading session data from background');
  
  chrome.runtime.sendMessage({ type: 'GET_SESSION' }, function(response) {
    if (chrome.runtime.lastError) {
      console.error('[Popup] Error:', chrome.runtime.lastError);
      showError('Failed to load session data');
      return;
    }
    
    if (response && response.session) {
      currentSession = response.session;
      currentEvents = response.session.events || [];
      
      console.log('[Popup] ✅ Session loaded:', {
        events: currentEvents.length,
        stats: response.session.stats
      });
      
      updateSessionInfo();
    } else {
      console.log('[Popup] No session data available');
      showError('No session data available');
    }
  });
}

function updateSessionInfo() {
  if (!currentSession) return;
  
  // Update basic info
  const sessionIdShort = currentSession.id.substring(0, 12) + '...';
  elements.sessionId.textContent = sessionIdShort;
  elements.pageUrl.textContent = currentSession.url || 'No page loaded';
  elements.eventCount.textContent = currentSession.eventCount || '0';
  
  // Update session time
  if (currentSession.startTime) {
    const duration = Math.floor((Date.now() - currentSession.startTime) / 1000);
    elements.sessionTime.textContent = formatTime(duration);
  }
}

// ─────────────────────────────────────────────────
// Analyze Handler
// ─────────────────────────────────────────────────

function handleAnalyzeClick() {
  console.log('[Popup] Analyze button clicked');
  
  if (!currentEvents || currentEvents.length === 0) {
    showError('⚠️ No events to analyze. Click some elements on the page!');
    return;
  }
  
  showLoading(true);
  
  try {
    // Build graph from events
    currentGraph = buildGraph(currentEvents);
    
    // Calculate metrics
    const metrics = calculateMetrics(currentGraph);
    
    // Display results
    displayMetrics(metrics);
    displayGraph(currentGraph);
    displayEventStats(currentSession.stats || {});
    
    // Show export actions
    elements.exportActions.style.display = 'block';
    
    showSuccess('🌟 Graph generated successfully!');
    console.log('[Popup] Analysis complete:', metrics);
    
  } catch (error) {
    console.error('[Popup] Analysis error:', error);
    showError('Error analyzing data: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// ─────────────────────────────────────────────────
// Graph Building
// ─────────────────────────────────────────────────

function buildGraph(events) {
  const nodes = new Map();
  const edges = [];
  
  // Build node map (elements)
  events.forEach((event, index) => {
    if (!nodes.has(event.element)) {
      nodes.set(event.element, {
        id: event.element,
        label: event.element,
        value: 0,
        connections: new Set(),
      });
    }
    nodes.get(event.element).value++;
  });
  
  // Build edges (element transitions)
  for (let i = 0; i < events.length - 1; i++) {
    const from = events[i].element;
    const to = events[i + 1].element;
    
    if (from !== to) {
      const edge = `${from}=>${to}`;
      edges.push({ from, to });
      
      nodes.get(from).connections.add(to);
      nodes.get(to).connections.add(from);
    }
  }
  
  return {
    nodes: Array.from(nodes.values()),
    edges: edges,
    nodeCount: nodes.size,
    edgeCount: edges.length,
  };
}

// ─────────────────────────────────────────────────
// Metrics
// ─────────────────────────────────────────────────

function calculateMetrics(graph) {
  const nodeCount = graph.nodeCount;
  const edgeCount = graph.edgeCount;
  
  const avgDegree = nodeCount > 0 ? (2 * edgeCount / nodeCount).toFixed(2) : 0;
  const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
  const density = maxPossibleEdges > 0 ? (edgeCount / maxPossibleEdges).toFixed(3) : 0;
  
  return {
    nodeCount,
    edgeCount,
    avgDegree,
    density,
  };
}

function displayMetrics(metrics) {
  elements.metricsCard.style.display = 'block';
  elements.nodeCount.textContent = metrics.nodeCount;
  elements.edgeCount.textContent = metrics.edgeCount;
  elements.avgDegree.textContent = metrics.avgDegree;
  elements.graphDensity.textContent = metrics.density;
}

// ─────────────────────────────────────────────────
// Graph Rendering
// ─────────────────────────────────────────────────

function displayGraph(graph) {
  if (graph.nodeCount === 0) {
    elements.canvasInfo.textContent = 'No nodes to display';
    return;
  }
  
  elements.graphCard.style.display = 'block';
  elements.canvasInfo.style.display = 'none';
  
  const canvas = elements.graphCanvas;
  const ctx = canvas.getContext('2d');
  
  // Set canvas resolution
  canvas.width = canvas.offsetWidth * devicePixelRatio;
  canvas.height = 300 * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  
  const width = canvas.offsetWidth;
  const height = 300;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;
  
  // Calculate node positions (circle layout)
  const angleSlice = (2 * Math.PI) / graph.nodeCount;
  graph.nodes.forEach((node, index) => {
    node.x = centerX + radius * Math.cos(index * angleSlice);
    node.y = centerY + radius * Math.sin(index * angleSlice);
  });
  
  // Draw edges
  ctx.strokeStyle = '#cbd5e0';
  ctx.lineWidth = 1;
  graph.edges.forEach(edge => {
    const from = graph.nodes.find(n => n.id === edge.from);
    const to = graph.nodes.find(n => n.id === edge.to);
    if (from && to) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  });
  
  // Draw nodes
  graph.nodes.forEach((node, index) => {
    const size = 8 + (node.value / graph.nodes.reduce((max, n) => Math.max(max, n.value), 1)) * 12;
    
    // Node circle
    ctx.fillStyle = '#3182ce';
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fill();
    
    // Node label
    ctx.fillStyle = '#2d3748';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = node.label.substring(0, 3);
    ctx.fillText(label, node.x, node.y + size + 15);
  });
  
  console.log('[Popup] Graph rendered:', graph.nodeCount, 'nodes,', graph.edgeCount, 'edges');
}

// ─────────────────────────────────────────────────
// Event Stats
// ─────────────────────────────────────────────────

function displayEventStats(stats) {
  if (!stats || Object.keys(stats).length === 0) {
    return;
  }
  
  elements.statsCard.style.display = 'block';
  elements.eventStats.innerHTML = '';
  
  Object.entries(stats).forEach(([eventType, count]) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span class="stat-label">${eventType}</span>
      <span class="stat-value">${count}</span>
    `;
    elements.eventStats.appendChild(row);
  });
}

// ─────────────────────────────────────────────────
// Clear Handler
// ─────────────────────────────────────────────────

function handleClearClick() {
  console.log('[Popup] Clear button clicked');
  
  chrome.runtime.sendMessage({ type: 'CLEAR_SESSION' }, function(response) {
    if (response && response.success) {
      currentEvents = [];
      currentSession = null;
      currentGraph = null;
      
      // Hide cards
      elements.metricsCard.style.display = 'none';
      elements.graphCard.style.display = 'none';
      elements.statsCard.style.display = 'none';
      elements.exportActions.style.display = 'none';
      
      // Reset info
      elements.eventCount.textContent = '0';
      elements.sessionId.textContent = 'Session cleared';
      
      showSuccess('🗑️ Session cleared successfully!');
      console.log('[Popup] Session cleared');
    }
  });
}

// ─────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────

function exportData(format) {
  console.log('[Popup] Exporting data as', format);
  
  if (!currentEvents || currentEvents.length === 0) {
    showError('No data to export');
    return;
  }
  
  try {
    let content;
    let filename;
    
    if (format === 'json') {
      content = JSON.stringify({
        session: currentSession,
        events: currentEvents,
        exportedAt: new Date().toISOString(),
      }, null, 2);
      filename = 'behavior-analysis.json';
    } else if (format === 'csv') {
      content = exportAsCSV(currentEvents);
      filename = 'behavior-analysis.csv';
    } else if (format === 'png') {
      downloadCanvasAsPNG();
      return;
    }
    
    downloadFile(content, filename);
    showSuccess(`✅ Exported as ${format.toUpperCase()}`);
    
  } catch (error) {
    console.error('[Popup] Export error:', error);
    showError('Export failed: ' + error.message);
  }
}

function exportAsCSV(events) {
  const headers = ['Timestamp', 'Event Type', 'Element', 'X', 'Y'];
  const rows = events.map(event => [
    new Date(event.timestamp).toLocaleString(),
    event.type,
    event.element,
    event.x,
    event.y,
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

function downloadCanvasAsPNG() {
  const canvas = elements.graphCanvas;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'behavior-graph.png';
  link.click();
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────
// Message Display
// ─────────────────────────────────────────────────

function showLoading(show) {
  elements.loading.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.style.display = 'block';
  elements.success.style.display = 'none';
  setTimeout(() => { elements.error.style.display = 'none'; }, 5000);
}

function showSuccess(message) {
  elements.success.textContent = message;
  elements.success.style.display = 'block';
  elements.error.style.display = 'none';
  setTimeout(() => { elements.success.style.display = 'none'; }, 4000);
}

// ─────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────

function formatTime(seconds) {
  if (seconds < 60) return seconds + 's';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

// ─────────────────────────────────────────────────
// Cleanup on unload
// ─────────────────────────────────────────────────

window.addEventListener('unload', () => {
  if (updateTimer) clearInterval(updateTimer);
});

// ─────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
