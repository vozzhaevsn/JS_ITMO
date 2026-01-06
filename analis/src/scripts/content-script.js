// ================================================
// BEHAVIOR GRAPH ANALYZER - CONTENT SCRIPT
// ================================================

console.log('[ContentScript] ✅ Content script loaded');

// ─────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────

const CONFIG = {
  TRACKED_EVENTS: ['click', 'dblclick', 'mouseenter', 'mouseleave', 'scroll', 'input', 'change', 'focus', 'blur', 'keydown'],
  DEBOUNCE_TIME: 100,
  DEBUG: true,
};

// ─────────────────────────────────────────────────
// State Management
// ─────────────────────────────────────────────────

let lastEventTime = 0;
let isInitialized = false;
let trackedElements = new Set();

// ─────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────

function initialize() {
  if (isInitialized) return;
  isInitialized = true;
  
  console.log('[ContentScript] ✅ Tracking initialized');
  
  // Send page loaded event
  chrome.runtime.sendMessage({
    type: 'PAGE_LOADED',
    url: window.location.href,
    title: document.title,
  }, function(response) {
    if (chrome.runtime.lastError) {
      console.error('[ContentScript] Error sending PAGE_LOADED:', chrome.runtime.lastError);
    } else {
      console.log('[ContentScript] ✅ Page loaded event sent');
    }
  });
  
  // Set up event listeners
  setupEventListeners();
}

// ─────────────────────────────────────────────────
// Event Listener Setup
// ─────────────────────────────────────────────────

function setupEventListeners() {
  CONFIG.TRACKED_EVENTS.forEach(eventType => {
    document.addEventListener(eventType, handleEvent, true);
  });
  
  console.log('[ContentScript] Event listeners attached:', CONFIG.TRACKED_EVENTS.join(', '));
}

// ─────────────────────────────────────────────────
// Event Handler
// ─────────────────────────────────────────────────

function handleEvent(event) {
  // Debounce
  const now = Date.now();
  if (now - lastEventTime < CONFIG.DEBOUNCE_TIME) {
    return;
  }
  lastEventTime = now;
  
  try {
    const eventData = extractEventData(event);
    
    // Debug logging
    if (CONFIG.DEBUG && event.type !== 'mousemove') {
      console.log(`[ContentScript] Event: ${event.type} on ${eventData.element}`);
    }
    
    // Send to background
    chrome.runtime.sendMessage({
      type: 'USER_EVENT',
      eventType: event.type,
      element: eventData.element,
      target: eventData.target,
      x: event.clientX || 0,
      y: event.clientY || 0,
      timestamp: now,
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('[ContentScript] Send error:', chrome.runtime.lastError);
      }
    });
    
  } catch (error) {
    console.error('[ContentScript] Error handling event:', error);
  }
}

// ─────────────────────────────────────────────────
// Event Data Extraction
// ─────────────────────────────────────────────────

function extractEventData(event) {
  const target = event.target;
  
  let element = 'unknown';
  let tagName = '';
  let classes = '';
  let id = '';
  
  if (target && target.tagName) {
    tagName = target.tagName.toLowerCase();
    classes = target.className ? target.className.split(' ')[0] : '';
    id = target.id || '';
    
    // Build element description
    if (id) {
      element = `${tagName}#${id}`;
    } else if (classes) {
      element = `${tagName}.${classes}`;
    } else {
      element = tagName;
    }
  }
  
  return {
    element: element,
    target: {
      tagName: tagName,
      className: classes,
      id: id,
      text: target?.textContent?.substring(0, 50) || '',
    }
  };
}

// ─────────────────────────────────────────────────
// Message Handlers
// ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('[ContentScript] Message received:', message.type);
  
  switch(message.type) {
    case 'GET_PAGE_INFO':
      sendResponse({
        success: true,
        url: window.location.href,
        title: document.title,
      });
      break;
    
    case 'GET_ELEMENTS':
      sendResponse({
        success: true,
        elementCount: document.querySelectorAll('*').length,
      });
      break;
    
    default:
      sendResponse({ success: false, error: 'Unknown message' });
  }
});

// ─────────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Reinitialize on dynamic page changes
window.addEventListener('load', function() {
  if (!isInitialized) {
    initialize();
  }
});

console.log('[ContentScript] ✅ Ready to track events');
