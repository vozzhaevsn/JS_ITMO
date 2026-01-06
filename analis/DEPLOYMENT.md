# 🚀 DEPLOYMENT & TESTING CHECKLIST

## ✅ FIXES APPLIED

### Commit 1: background.js
- ✅ Initialize `currentSession` at startup
- ✅ Add `GET_SESSION` message handler for popup
- ✅ Return proper response format with events array
- ✅ Ensure `return true` for async responses
- ✅ Add comprehensive logging

**File:** https://github.com/vozzhaevsn/JS_ITMO/blob/main/analis/src/scripts/background.js

### Commit 2: popup.js
- ✅ Add `GET_CURRENT_SESSION` message handler
- ✅ Parse response and display session info
- ✅ Auto-refresh every 500ms for real-time updates
- ✅ Build graph from event types
- ✅ Display metrics and event count

**File:** https://github.com/vozzhaevsn/JS_ITMO/blob/main/analis/src/ui/popup.js

---

## 🧪 TESTING CHECKLIST

### Step 1: Reload Extension
```
1. Open comet://extensions/ or chrome://extensions/
2. Find "Behavior Graph Analyzer"
3. Click refresh button (↻) in top right
4. Check console for ✅ logs
```

### Step 2: Test Content Collection
```
1. Open new tab: https://www.example.com
2. Press F12 to open DevTools
3. Click on different elements 15+ times
4. Hover over buttons (5+ times)
5. Scroll page (2-3 times)
```

**Expected logs in Console:**
```
✅ [ContentScript] ✅ Трекинг инициализирован
✅ [ContentScript] Click событие на: button
✅ [ContentScript] Hover событие на: a
✅ [ContentScript] Scroll событие
```

### Step 3: Check Background Script
```
1. Go to comet://extensions/
2. Find "Behavior Graph Analyzer"
3. Click "Service Worker" link
4. Check DevTools that opens
```

**Expected logs:**
```
✅ [BackgroundScript] Нагружен
✅ [BackgroundScript] ✅ Session initialized: session_1704593400000
✅ [BackgroundScript] Новая страница: https://example.com
✅ [BackgroundScript] Записано событие: click - Total: 1
✅ [BackgroundScript] Записано событие: click - Total: 2
```

### Step 4: Open Popup
```
1. Click extension icon in toolbar
2. Check if popup opens without errors
3. Look for "Анализировать" button
4. Check console for popup logs
```

**Expected logs in Popup Console:**
```
✅ [Popup] Loading...
✅ [Popup] ✅ Initialized
✅ [Popup] Кнопка анализа
✅ [Popup] Ответ: {success: true, session: {...}}
✅ [Popup] Получено 15 событий
```

### Step 5: Check Data Display
```
1. Look at popup window
2. Should show:
   - Узлов: 15 (or your event count)
   - Рёбер: 14 (one less than events)
   - Событий: 15
   - Canvas with graph visualization
3. Graph should show circular layout
```

### Step 6: Test Auto-Refresh
```
1. Go back to example.com tab
2. Click 5 more times
3. Watch popup (don't click Analyze)
4. Numbers should auto-update every 500ms
5. Graph should grow in real-time
```

### Step 7: Test Export
```
1. Click "Экспорт" button
2. File should download: session_TIMESTAMP.json
3. Open JSON in text editor
4. Verify it contains:
   - sessionId
   - eventCount
   - events array with click/hover/scroll
```

---

## ❌ TROUBLESHOOTING

### Problem: "No data for export"

**Solution:**
1. Check background script logs - do you see events being recorded?
2. Make sure you have 10+ events on the page
3. Wait 500ms after performing actions
4. Click "Анализировать" button

### Problem: Events not being collected

**Check:**
```
1. Is Content Script loaded?
   - Should see ✅ [ContentScript] logs
2. Is Page Loaded event sent?
   - Should see "PAGE_LOADED" in background logs
3. Are elements interactive?
   - Try clicking buttons, links, inputs
```

### Problem: Popup shows "Событий нет"

**Solution:**
1. Open DevTools in popup (F12)
2. Check console for errors
3. Look for response logs like:
   ```
   [Popup] Response: {success: true, session: {...}}
   ```
4. If no response, check Background Service Worker logs

### Problem: Graph not rendering

**Solution:**
1. Canvas should always render (even if empty)
2. If blank: check Canvas context initialization
3. Verify events are being received (check event count)
4. Try refreshing popup

---

## 🔍 DEBUG MODE

### Enable Detailed Logging

Add this to background.js console:
```javascript
// Log all messages
setInterval(() => {
  console.log('[Debug] Active Sessions:', activeSessions.size);
  console.log('[Debug] Current Events:', sessionEvents.length);
  console.log('[Debug] Session ID:', currentSession?.id);
}, 2000);
```

Add this to popup.js console:
```javascript
// Force analyze every 1 second
setInterval(() => {
  chrome.runtime.sendMessage({type: 'GET_CURRENT_SESSION'}, (r) => {
    console.log('[Debug] Session data:', r);
  });
}, 1000);
```

---

## 📊 EXPECTED RESULTS

### After 20 clicks:
```
ИНФОРМАЦИЯ СЕССИИ
Session: session_1704593400...
URL: https://example.com
Events: 20

МЕТРИКИ
Узлов: 20
Рёбер: 19
Событий: 20

[Canvas with circular graph showing click → click → click ...]
```

### After mixed actions (clicks, hovers, scrolls):
```
МЕТРИКИ
Узлов: 4 (click, hover, scroll, wheel)
Рёбер: 8 (transitions between event types)
Событий: 15

[Canvas with graph showing transitions between event types]
```

---

## ✅ FINAL CHECKLIST

- [ ] Extension reloaded
- [ ] Content script collecting events (check logs)
- [ ] Background script storing events (check logs)
- [ ] Popup opening without errors
- [ ] Auto-refresh working (numbers updating)
- [ ] Manual "Анализировать" button working
- [ ] Canvas rendering graph
- [ ] Export button downloading JSON
- [ ] All console logs showing ✅ marks
- [ ] No errors in any console

**If all ✅ - DEPLOYMENT SUCCESSFUL! 🎉**

---

## 🚀 NEXT STEPS

1. **Performance Testing**
   - Test with 100+ events
   - Monitor memory usage
   - Check CPU usage during graph rendering

2. **Cross-Browser Testing**
   - Test on Chrome 88+
   - Test on Comet Browser
   - Test on Edge

3. **Feature Additions**
   - Add graph zoom/pan
   - Add event filtering
   - Add session history
   - Add bot detection

4. **Optimization**
   - Optimize canvas rendering
   - Add worker threads for analysis
   - Implement IndexedDB storage

---

## 📞 SUPPORT

If something doesn't work:

1. Check the logs in all three contexts:
   - Content Script Console (F12 on webpage)
   - Background Service Worker (extensions page)
   - Popup Console (F12 in popup)

2. Look for error messages or missing logs

3. Verify files were updated:
   - `background.js` has `initializeSession()` function
   - `background.js` has `case 'GET_SESSION':` handler
   - `popup.js` has `analyzeCurrentSession()` function
   - `popup.js` has auto-refresh interval

4. Force reload extension

5. Clear browser cache (Ctrl+Shift+Del)

---

**Version:** 1.0.0
**Last Updated:** 2026-01-07
**Status:** ✅ READY FOR DEPLOYMENT
