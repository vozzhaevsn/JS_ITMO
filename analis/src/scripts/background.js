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
let eventCounter = 0;

// ============ LEVEL 2: EVENT FILTERS ============
const EVENT_FILTERS = {
  IGNORE_EVENTS: [
    'mouseenter',  // Filter out mouse enter/leave pairs
    'mouseleave',  // They create noise with minimal value
    'mouseover',
    'mouseout'
  ],
  
  COLLAPSE_EVENTS: {
    'click': 'click',          // Important events
    'change': 'change',
    'focus': 'focus',
    'blur': 'blur',
    'input': 'input',
    'scroll': 'scroll',
    'submit': 'submit',
    'keydown': 'keydown'
  }
};

// Filter function to reduce noise
function shouldFilterEvent(event) {
  // Ignore noise events
  if (EVENT_FILTERS.IGNORE_EVENTS.includes(event.type)) {
    return true;
  }
  
  // Filter duplicate events < 50ms apart on same element
  if (sessionEvents.length > 0) {
    const lastEvent = sessionEvents[sessionEvents.length - 1];
    const timeDiff = event.timestamp - lastEvent.timestamp;
    
    if (timeDiff < 50 && lastEvent.element === event.element && lastEvent.type === event.type) {
      console.log('[BackgroundScript] 🔇 Filtered duplicate:', event.type, 'at', event.element);
      return true;
    }
  }
  
  return false;
}

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
  eventCounter = 0;
  
  // Level 3: Save to persistent storage
  const sessionKey = 'session_' + currentSession.id;
  const sessionData = {
    session: currentSession,
    events: sessionEvents,
    stats: eventStats,
    savedAt: Date.now()
  };
  
  chrome.storage.local.set({ [sessionKey]: sessionData }, function() {
    console.log('[BackgroundScript] ✅ Session initialized:', currentSession.id);
  });
  
  return currentSession;
}

// Initialize on load
if (!currentSession) {
  initializeSession();
}

// Level 3: Auto-cleanup old sessions (every 24 hours)
function cleanupOldSessions() {
  const RETENTION_DAYS = 7;
  const cutoffTime = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
  
  chrome.storage.local.get(null, function(items) {
    let removed = 0;
    Object.keys(items).forEach(key => {
      if (key.startsWith('session_')) {
        const savedAt = items[key].savedAt || 0;
        if (savedAt < cutoffTime) {
          chrome.storage.local.remove(key);
          removed++;
          console.log('[BackgroundScript] 🗑️ Removed old session:', key);
        }
      }
    });
    if (removed > 0) {
      console.log('[BackgroundScript] 🧹 Cleanup: removed', removed, 'old sessions');
    }
  });
}

// Run cleanup every 24 hours
setInterval(cleanupOldSessions, 24 * 60 * 60 * 1000);

// ─────────────────────────────────────────────
// Message Handler
// ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('[BackgroundScript] 📬 Message received:', message.type);
  
  try {
    switch(message.type) {
      
      // ─── PAGE_LOADED ───
      case 'PAGE_LOADED':
        handlePageLoaded(message, sender);
        sendResponse({ success: true });
        break;
      
      // ─── USER_EVENT / TRACK_EVENT ───
      case 'USER_EVENT':
      case 'TRACK_EVENT':
        handleUserEvent(message, sender);
        sendResponse({ success: true });
        break;
      
      // ─── GET_SESSION / GET_CURRENT_SESSION ───
      case 'GET_SESSION':
      case 'GET_CURRENT_SESSION':
        handleGetSession(sendResponse);
        return true; // async response
      
      // ─── EXPORT_DATA ───
      case 'EXPORT_DATA':
        handleExportData(sendResponse);
        return true;
      
      // ─── CLEAR_SESSION ───
      case 'CLEAR_SESSION':
        initializeSession();
        sendResponse({ success: true });
        break;
      
      // ─── GET_STORED_SESSIONS ───
      case 'GET_STORED_SESSIONS':
        handleGetStoredSessions(sendResponse);
        return true;
      
      default:
        console.log('[BackgroundScript] ⚠️ Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[BackgroundScript] ❌ Error handling message:', error);
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
  
  console.log('[BackgroundScript] 📄 Page loaded:', currentSession.url);
  
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
  
  // Level 2: Apply filters
  if (shouldFilterEvent(event)) {
    return; // Don't add filtered events
  }
  
  // Add to events array
  sessionEvents.push(event);
  
  // Update stats
  if (!eventStats[event.type]) {
    eventStats[event.type] = 0;
  }
  eventStats[event.type]++;
  
  eventCounter++;
  const totalEvents = sessionEvents.length;
  console.log(`[BackgroundScript] ✓ Event: ${event.type} - Total: ${totalEvents}`);
  
  // Level 3: Save every 30 events to persistent storage
  if (eventCounter % 30 === 0) {
    const sessionKey = 'session_' + currentSession.id;
    const sessionData = {
      session: currentSession,
      events: sessionEvents,
      stats: eventStats,
      savedAt: Date.now()
    };
    
    chrome.storage.local.set({ [sessionKey]: sessionData }, function() {
      console.log('[BackgroundScript] 💾 Auto-saved', totalEvents, 'events to persistent storage');
    });
  }
}

// ─────────────────────────────────────────────
// Get Session Handler (Level 1: Fixed)
// ─────────────────────────────────────────────

function handleGetSession(sendResponse) {
  console.log('[BackgroundScript] ✅ GET_SESSION request, events:', sessionEvents.length);
  
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
        events: events.slice(-200), // Last 200 events
        stats: stats,
      }
    };
    
    console.log('[BackgroundScript] 📤 Sending response with', events.length, 'events');
    sendResponse(response);
  });
}

// ─────────────────────────────────────────────
// Get Stored Sessions Handler (Level 3: New)
// ─────────────────────────────────────────────

function handleGetStoredSessions(sendResponse) {
  chrome.storage.local.get(null, function(items) {
    const sessions = {};
    let count = 0;
    
    Object.keys(items).forEach(key => {
      if (key.startsWith('session_')) {
        sessions[key] = items[key];
        count++;
      }
    });
    
    console.log('[BackgroundScript] 📚 Found', count, 'stored sessions');
    sendResponse({
      success: true,
      sessions: sessions,
      count: count
    });
  });
}

// ─────────────────────────────────────────────
// Export Data Handler
// ─────────────────────────────────────────────

function handleExportData(sendResponse) {
  console.log('[BackgroundScript] 📊 Export request');
  
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
        totalUnique: new Set(events.map(e => e.element)).size,
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

// Clear current session when tab closes
chrome.tabs.onRemoved.addListener(function(tabId) {
  if (currentSession && currentSession.tabId === tabId) {
    console.log('[BackgroundScript] 🔴 Tab closed, clearing current session');
    initializeSession();
  }
});

// ─────────────────────────────────────────────
// Storage Debug & Initialization
// ─────────────────────────────────────────────

chrome.storage.local.get(null, function(items) {
  const sessionCount = Object.keys(items).filter(k => k.startsWith('session_')).length;
  console.log('[BackgroundScript] 💾 Storage available:', sessionCount, 'saved sessions');
  
  if (items.sessionEvents && items.sessionEvents.length > 0) {
    console.log('[BackgroundScript] 📥 Loaded', items.sessionEvents.length, 'events from storage');
  }
});
