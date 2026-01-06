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
  console.log('[Popup] 🚀 Initializing popup');
  
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
  
  console.log('[Popup] 🎯 Event listeners attached');
}

// ─────────────────────────────────────────────────
// Session Data Loading (Level 1: Fixed)
// ─────────────────────────────────────────────────

function loadSessionData() {
  console.log('[Popup] 📥 Loading session data from background');
  
  // Wait a bit for session to be initialized
  setTimeout(() => {
    chrome.runtime.sendMessage(
      { type: 'GET_SESSION' },
      function(response) {
        if (chrome.runtime.lastError) {
          console.error('[Popup] ❌ Message error:', chrome.runtime.lastError);
          showError('Failed to connect to background script');
          return;
        }
        
        console.log('[Popup] 📨 Response received:', response);
        
        if (!response) {
          console.log('[Popup] ⚠️ Empty response from background');
          showError('No response from background script');
          return;
        }
        
        if (!response.success) {
          console.log('[Popup] ⚠️ Response not successful');
          showError('Failed to load session: ' + (response.error || 'Unknown error'));
          return;
        }
        
        if (!response.session) {
          console.log('[Popup] ⚠️ No session in response');
          showError('No session data available. Click elements on the page first!');
          return;
        }
        
        // Store session data
        currentSession = response.session;
        currentEvents = response.session.events || [];
        
        console.log('[Popup] ✅ Session loaded:', {
          id: currentSession.id,
          url: currentSession.url,
          eventCount: currentEvents.length,
          stats: currentSession.stats
        });
        
        updateSessionInfo();
      }
    );
  }, 300); // Wait 300ms for session to initialize
}

function updateSessionInfo() {
  if (!currentSession) {
    console.log('[Popup] No session to display');
    return;
  }
  
  try {
    // Update basic info
    const sessionIdShort = currentSession.id.substring(0, 12) + '...';
    if (elements.sessionId) elements.sessionId.textContent = sessionIdShort;
    if (elements.pageUrl) elements.pageUrl.textContent = currentSession.url || 'No page loaded';
    if (elements.eventCount) elements.eventCount.textContent = currentSession.eventCount || currentEvents.length || '0';
    
    // Update session time
    if (currentSession.startTime && elements.sessionTime) {
      const duration = Math.floor((Date.now() - currentSession.startTime) / 1000);
      elements.sessionTime.textContent = formatTime(duration);
    }
  } catch (error) {
    console.error('[Popup] Error updating session info:', error);
  }
}

// ─────────────────────────────────────────────────
// Analyze Handler (Level 1: Improved)
// ─────────────────────────────────────────────────

function handleAnalyzeClick() {
  console.log('[Popup] 🔍 Analyze button clicked');
  
  // Refresh data before analyzing
  console.log('[Popup] 🔄 Refreshing data from background...');
  
  chrome.runtime.sendMessage(
    { type: 'GET_SESSION' },
    function(response) {
      if (chrome.runtime.lastError) {
        console.error('[Popup] ❌ Error:', chrome.runtime.lastError);
        showError('Failed to load data');
        return;
      }
      
      if (!response || !response.session) {
        console.log('[Popup] ⚠️ No session data');
        showError('⚠️ No events to analyze. Click some elements on the page first!');
        return;
      }
      
      // Update current data
      currentSession = response.session;
      currentEvents = response.session.events || [];
      
      console.log('[Popup] 📊 Data refreshed:', currentEvents.length, 'events');
      
      if (currentEvents.length === 0) {
        showError('⚠️ No events collected yet. Interact with the page first!');
        return;
      }
      
      showLoading(true);
      
      try {
        // Build graph from events
        console.log('[Popup] 🔨 Building graph...');
        currentGraph = buildGraph(currentEvents);
        
        // Calculate metrics
        const metrics = calculateMetrics(currentGraph);
        
        // Display results
        displayMetrics(metrics);
        displayGraph(currentGraph);
        displayEventStats(currentSession.stats || {});
        
        // Show export actions
        elements.exportActions.style.display = 'block';
        
        showSuccess('🌟 Graph generated successfully! (' + currentEvents.length + ' events)');
        console.log('[Popup] ✅ Analysis complete:', metrics);
        
      } catch (error) {
        console.error('[Popup] ❌ Analysis error:', error);
        showError('Error analyzing data: ' + error.message);
      } finally {
        showLoading(false);
      }
    }
  );
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
  
  console.log('[Popup] 📊 Graph built:', nodes.size, 'nodes,', edges.length, 'edges');
  
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
  if (elements.nodeCount) elements.nodeCount.textContent = metrics.nodeCount;
  if (elements.edgeCount) elements.edgeCount.textContent = metrics.edgeCount;
  if (elements.avgDegree) elements.avgDegree.textContent = metrics.avgDegree;
  if (elements.graphDensity) elements.graphDensity.textContent = metrics.density;
}

// ─────────────────────────────────────────────────
// Graph Rendering
// ─────────────────────────────────────────────────

function displayGraph(graph) {
  if (!graph || graph.nodeCount === 0) {
    if (elements.canvasInfo) {
      elements.canvasInfo.textContent = 'No nodes to display';
    }
    return;
  }
  
  elements.graphCard.style.display = 'block';
  if (elements.canvasInfo) elements.canvasInfo.style.display = 'none';
  
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
  
  console.log('[Popup] 🎨 Graph rendered:', graph.nodeCount, 'nodes,', graph.edgeCount, 'edges');
}

// ─────────────────────────────────────────────────
// Event Stats
// ─────────────────────────────────────────────────

function displayEventStats(stats) {
  if (!stats || Object.keys(stats).length === 0) {
    console.log('[Popup] No stats to display');
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
  
  console.log('[Popup] 📈 Stats displayed:', stats);
}

// ─────────────────────────────────────────────────
// Clear Handler
// ─────────────────────────────────────────────────

function handleClearClick() {
  console.log('[Popup] 🗑️ Clear button clicked');
  
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
      if (elements.eventCount) elements.eventCount.textContent = '0';
      if (elements.sessionId) elements.sessionId.textContent = 'Session cleared';
      
      showSuccess('🗑️ Session cleared successfully!');
      console.log('[Popup] ✅ Session cleared');
    }
  });
}

// ─────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────

function exportData(format) {
  console.log('[Popup] 💾 Exporting data as', format);
  
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
    console.log('[Popup] ✅ Export successful:', filename);
    
  } catch (error) {
    console.error('[Popup] ❌ Export error:', error);
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
  if (elements.loading) {
    elements.loading.style.display = show ? 'flex' : 'none';
  }
}

function showError(message) {
  console.error('[Popup] ❌', message);
  if (elements.error) {
    elements.error.textContent = message;
    elements.error.style.display = 'block';
  }
  if (elements.success) {
    elements.success.style.display = 'none';
  }
  setTimeout(() => {
    if (elements.error) elements.error.style.display = 'none';
  }, 5000);
}

function showSuccess(message) {
  console.log('[Popup] ✅', message);
  if (elements.success) {
    elements.success.textContent = message;
    elements.success.style.display = 'block';
  }
  if (elements.error) {
    elements.error.style.display = 'none';
  }
  setTimeout(() => {
    if (elements.success) elements.success.style.display = 'none';
  }, 4000);
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
  console.log('[Popup] Popup unloading');
});

// ─────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
