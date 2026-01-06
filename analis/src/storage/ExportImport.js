/**
 * Экспорт и импорт данных
 * Поддерживает: JSON, CSV, visualization data
 */

class ExportImport {
  /**
   * Экспортировать граф в JSON
   */
  static exportGraphAsJSON(graph) {
    const jsonData = graph.toJSON();
    const jsonString = JSON.stringify(jsonData, null, 2);
    return jsonString;
  }

  /**
   * Экспортировать сессии в JSON
   */
  static exportSessionsAsJSON(sessions) {
    const jsonData = {
      sessions,
      exportDate: new Date().toISOString(),
      exportCount: sessions.length
    };
    return JSON.stringify(jsonData, null, 2);
  }

  /**
   * Экспортировать в CSV (сессии)
   */
  static exportSessionsAsCSV(sessions) {
    const headers = ['ID', 'Start Time', 'Duration (ms)', 'Event Count', 'Classification'];
    const rows = sessions.map(s => [
      s.id,
      new Date(s.startTime).toISOString(),
      s.duration || 0,
      s.events.length,
      s.classification?.prediction || 'unknown'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Экспортировать данные для Cytoscape.js
   */
  static exportGraphAsCytoscape(graph) {
    const nodes = [];
    const edges = [];

    // Ноды
    graph.nodes.forEach((node, id) => {
      nodes.push({
        data: {
          id: id,
          label: node.label || id,
          weight: node.pageRank || 0,
          degree: node.inDegree + node.outDegree
        }
      });
    });

    // Ребра
    graph.edges.forEach((edge, key) => {
      edges.push({
        data: {
          id: key,
          source: edge.source,
          target: edge.target,
          weight: edge.weight,
          count: edge.count
        }
      });
    });

    return {
      nodes,
      edges,
      style: this.getDefaultCytoscapeStyle()
    };
  }

  /**
   * Получить стиль Cytoscape
   */
  static getDefaultCytoscapeStyle() {
    return [
      {
        selector: 'node',
        style: {
          'background-color': '#0891b2',
          'label': 'data(label)',
          'width': 'mapData(weight, 0, 1, 20, 50)',
          'height': 'mapData(weight, 0, 1, 20, 50)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': 12,
          'color': '#ffffff'
        }
      },
      {
        selector: 'edge',
        style: {
          'line-color': '#999999',
          'target-arrow-color': '#999999',
          'target-arrow-shape': 'triangle',
          'width': 'mapData(weight, 0, 100, 1, 5)',
          'opacity': 0.6
        }
      },
      {
        selector: 'node:selected',
        style: {
          'background-color': '#f97316'
        }
      }
    ];
  }

  /**
   * Открыть JSON и загрузить в граф
   */
  static importGraphFromJSON(jsonString, graphInstance) {
    try {
      const data = JSON.parse(jsonString);
      graphInstance.fromJSON(data);
      console.log('[ExportImport] Graph imported successfully');
      return graphInstance;
    } catch (error) {
      console.error('[ExportImport] Error importing graph:', error);
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Открыть JSON сессий
   */
  static importSessionsFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return Array.isArray(data.sessions) ? data.sessions : data;
    } catch (error) {
      console.error('[ExportImport] Error importing sessions:', error);
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Скачать файл
   */
  static downloadFile(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Моментальный тренд график
   */
  static getGraphMetricsTrend(sessions) {
    return sessions.map(s => ({
      timestamp: s.startTime,
      nodeCount: s.graph?.nodes?.size || 0,
      edgeCount: s.graph?.edges?.size || 0,
      sessionDuration: s.duration,
      eventCount: s.events.length
    }));
  }

  /**
   * Статистика всех сессий
   */
  static getSessionStatistics(sessions) {
    if (sessions.length === 0) return null;

    const durations = sessions.map(s => s.duration || 0);
    const eventCounts = sessions.map(s => s.events.length);
    const classifications = {};

    sessions.forEach(s => {
      const pred = s.classification?.prediction || 'unknown';
      classifications[pred] = (classifications[pred] || 0) + 1;
    });

    return {
      totalSessions: sessions.length,
      avgDuration: durations.reduce((a, b) => a + b) / durations.length,
      avgEventCount: eventCounts.reduce((a, b) => a + b) / eventCounts.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      classifications
    };
  }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportImport;
}
