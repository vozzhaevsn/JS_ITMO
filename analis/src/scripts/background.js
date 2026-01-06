// ============================================
// BEHAVIOR GRAPH ANALYZER - BACKGROUND WORKER
// ============================================

console.log('[BackgroundScript] Service Worker loaded');

// ─────────────────────────────────────────────
// Global State Management
// ─────────────────────────────────────────────

let currentSession = null;
let sessionEvents = [];
let eventStats = {};

// ─────────────────────────────────────────────
// Session Initialization
// ─────────────────────────────────────────────

function initializeSession() {
  currentSession = {
    id: 'session_' + Date.now(),
    startTime: Date.now(),
    url: '',
    tabId: null,
  };
  sessionEvents = [];
  eventStats = {};
  
  // Save to storage
  chrome.storage.local.set({
    'session': currentSession,
    'sessionEvents': sessionEvents,
    'eventStats': eventStats,
  }, function() {
    console.log('[BackgroundScript] ✅ Session initialized:', currentSession.id);
  });
  
  return currentSession;
}

// Initialize on load
if (!currentSession) {
  initializeSession();
}

// ─────────────────────────────────────────────
// Message Handler
// ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('[BackgroundScript] Message received:', message.type);
  
  try {
    switch(message.type) {
      
      // ─── PAGE_LOADED ───
      case 'PAGE_LOADED':
        handlePageLoaded(message, sender);
        sendResponse({ success: true });
        break;
      
      // ─── USER_EVENT ───
      case 'USER_EVENT':
        handleUserEvent(message, sender);
        sendResponse({ success: true });
        break;
      
      // ─── GET_SESSION / GET_CURRENT_SESSION ───
      case 'GET_SESSION':
      case 'GET_CURRENT_SESSION':
        handleGetSession(sendResponse);
        return true; // async response
        break;
      
      // ─── EXPORT_DATA ───
      case 'EXPORT_DATA':
        handleExportData(sendResponse);
        return true;
        break;
      
      // ─── CLEAR_SESSION ───
      case 'CLEAR_SESSION':
        initializeSession();
        sendResponse({ success: true });
        break;
      
      default:
        console.log('[BackgroundScript] Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[BackgroundScript] Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// Page Loaded Handler
// ─────────────────────────────────────────────

function handlePageLoaded(message, sender) {
  if (!currentSession) {
    initializeSession();
  }
  
  currentSession.url = message.url || sender.url;
  currentSession.tabId = sender.tab.id;
  
  console.log('[BackgroundScript] Page loaded:', currentSession.url);
  
  // Save to storage
  chrome.storage.local.set({ 'session': currentSession });
}

// ─────────────────────────────────────────────
// User Event Handler
// ─────────────────────────────────────────────

function handleUserEvent(message, sender) {
  if (!currentSession) {
    initializeSession();
  }
  
  const event = {
    id: Date.now() + Math.random(),
    type: message.eventType,
    element: message.element || 'unknown',
    timestamp: Date.now(),
    target: message.target || null,
    x: message.x || 0,
    y: message.y || 0,
    url: currentSession.url,
  };
  
  // Add to events array
  sessionEvents.push(event);
  
  // Update stats
  if (!eventStats[event.type]) {
    eventStats[event.type] = 0;
  }
  eventStats[event.type]++;
  
  const totalEvents = sessionEvents.length;
  console.log(`[BackgroundScript] Event: ${event.type} - Total: ${totalEvents}`);
  
  // Save every 10 events
  if (totalEvents % 10 === 0) {
    chrome.storage.local.set({
      'sessionEvents': sessionEvents,
      'eventStats': eventStats,
    }, function() {
      console.log('[BackgroundScript] 💾 Saved', totalEvents, 'events to storage');
    });
  }
}

// ─────────────────────────────────────────────
// Get Session Handler
// ─────────────────────────────────────────────

function handleGetSession(sendResponse) {
  console.log('[BackgroundScript] ✅ GET_SESSION request');
  
  // Try to get from storage first
  chrome.storage.local.get(['session', 'sessionEvents', 'eventStats'], function(result) {
    const session = result.session || currentSession;
    const events = result.sessionEvents || sessionEvents;
    const stats = result.eventStats || eventStats;
    
    const response = {
      success: true,
      session: {
        id: session.id,
        url: session.url,
        startTime: session.startTime,
        eventCount: events.length,
        events: events.slice(-100), // Last 100 events
        stats: stats,
      }
    };
    
    console.log('[BackgroundScript] Sending response:', {
      eventCount: events.length,
      stats: stats
    });
    
    sendResponse(response);
  });
}

// ─────────────────────────────────────────────
// Export Data Handler
// ─────────────────────────────────────────────

function handleExportData(sendResponse) {
  console.log('[BackgroundScript] Export request');
  
  chrome.storage.local.get(['session', 'sessionEvents', 'eventStats'], function(result) {
    const session = result.session || currentSession;
    const events = result.sessionEvents || sessionEvents;
    const stats = result.eventStats || eventStats;
    
    const exportData = {
      session: {
        id: session.id,
        url: session.url,
        startTime: session.startTime,
        duration: Date.now() - session.startTime,
      },
      events: events,
      statistics: {
        totalEvents: events.length,
        eventTypes: stats,
      }
    };
    
    sendResponse({
      success: true,
      data: exportData
    });
  });
}

// ─────────────────────────────────────────────
// Tab Management
// ─────────────────────────────────────────────

// Clear session when tab closes
chrome.tabs.onRemoved.addListener(function(tabId) {
  if (currentSession && currentSession.tabId === tabId) {
    console.log('[BackgroundScript] Tab closed, clearing session');
    chrome.storage.local.remove(['session', 'sessionEvents', 'eventStats']);
    initializeSession();
  }
});

// ─────────────────────────────────────────────
// Storage Debug
// ─────────────────────────────────────────────

chrome.storage.local.get(null, function(items) {
  console.log('[BackgroundScript] Storage available:', Object.keys(items).length, 'keys');
  if (items.sessionEvents) {
    console.log('[BackgroundScript] Loaded events from storage:', items.sessionEvents.length);
  }
});
