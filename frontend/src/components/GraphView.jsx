import { useEffect, useState, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { graphAPI } from '../api';

// Helper functions
const getCategoryColor = (category) => {
  if (!category) return '#95a5a6';
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
                 '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#330867'];
  const index = category.charCodeAt(0) % colors.length;
  return colors[index];
};

const getRelationColor = (type) => {
  const colors = {
    'related': '#667eea',
    'synonym': '#48bb78',
    'antonym': '#f56565',
    'parent': '#ed8936',
    'child': '#4299e1',
    'see_also': '#9f7aea'
  };
  return colors[type] || '#95a5a6';
};

// Функция для переноса текста на несколько строк
const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  
  if (words.length === 0) return lines;
  
  let currentLine = words[0];
  
  // Если первое слово слишком длинное, разбиваем его
  if (ctx.measureText(currentLine).width > maxWidth) {
    while (currentLine.length > 0) {
      let fit = '';
      let fitWidth = 0;
      for (let i = 0; i < currentLine.length; i++) {
        const testFit = currentLine.substring(0, i + 1);
        const testWidth = ctx.measureText(testFit).width;
        if (testWidth <= maxWidth) {
          fit = testFit;
          fitWidth = testWidth;
        } else {
          break;
        }
      }
      if (fit) {
        lines.push(fit);
        currentLine = currentLine.substring(fit.length);
      } else {
        // Если даже один символ не помещается, все равно добавляем
        lines.push(currentLine.substring(0, 1));
        currentLine = currentLine.substring(1);
      }
    }
    currentLine = '';
  }

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const width = ctx.measureText(testLine).width;
    
    if (width < maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // Проверяем, не слишком ли длинное само слово
      if (ctx.measureText(word).width > maxWidth) {
        // Разбиваем длинное слово
        let remaining = word;
        while (remaining.length > 0) {
          let fit = '';
          for (let j = 0; j < remaining.length; j++) {
            const testFit = remaining.substring(0, j + 1);
            if (ctx.measureText(testFit).width <= maxWidth) {
              fit = testFit;
            } else {
              break;
            }
          }
          if (fit) {
            lines.push(fit);
            remaining = remaining.substring(fit.length);
          } else {
            lines.push(remaining.substring(0, 1));
            remaining = remaining.substring(1);
          }
        }
        currentLine = '';
      } else {
        currentLine = word;
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text];
};

// Функция для рисования прямоугольника с закругленными углами
const roundRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

function GraphView({ onTermSelect, terms = [] }) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fgRef = useRef();
  
  // Загружаем сохраненные параметры из localStorage
  const loadSavedParams = () => {
    try {
      const saved = localStorage.getItem('graphParams');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load saved graph params:', e);
    }
    return {
      linkDistance: 200,
      nodeRepulsion: 3000,
      centerStrength: 0.05,
      chargeStrength: -1000,
      nodeSize: 20,
      linkCurvature: 0.3,
      linkOpacity: 0.3
    };
  };
  
  // Параметры графа
  const [graphParams, setGraphParams] = useState(loadSavedParams);
  
  // Сохраняем параметры в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem('graphParams', JSON.stringify(graphParams));
    } catch (e) {
      console.warn('Failed to save graph params:', e);
    }
  }, [graphParams]);

  useEffect(() => {
    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await graphAPI.get();
        const { nodes, edges } = response.data;

        if (!nodes || nodes.length === 0) {
          setError('Нет данных для отображения');
          setLoading(false);
          return;
        }

        // Transform data for react-force-graph
        const graphNodes = nodes.map(node => ({
          id: node.id,
          name: node.label || `Term ${node.id}`,
          description: node.description || '',
          category: node.category || '',
          color: getCategoryColor(node.category)
        }));

        const graphLinks = (edges || []).map(edge => ({
          source: edge.from_id,
          target: edge.to_id,
          label: edge.label || edge.type || '',
          type: edge.type,
          color: getRelationColor(edge.type)
        }));

        setGraphData({
          nodes: graphNodes,
          links: graphLinks
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading graph:', err);
        setError(err.response?.data?.detail || err.message || 'Ошибка загрузки графа');
        setLoading(false);
      }
    };

    loadGraph();
  }, []);

  const handleNodeClick = useCallback((node) => {
    const term = terms.find(t => t.id === node.id);
    if (term && onTermSelect) {
      onTermSelect(term);
    }
  }, [terms, onTermSelect]);

  // Функция авто-масштабирования и центрирования
  const autoFit = useCallback(() => {
    if (!fgRef.current || !graphData) return;
    
    // Небольшая задержка для завершения стабилизации
    setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(400, 50, (node) => true);
      }
    }, 100);
  }, [graphData]);

  // Автоматически подгоняем вид после загрузки данных
  useEffect(() => {
    if (graphData && !loading && fgRef.current) {
      // Даем время графу отрендериться
      const timer = setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(400, 50, (node) => true);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [graphData, loading]);

  // Применяем параметры к графу при их изменении
  useEffect(() => {
    if (fgRef.current && graphData) {
      const linkForce = fgRef.current.d3Force('link');
      if (linkForce) {
        linkForce.distance(graphParams.linkDistance);
      }
      
      const chargeForce = fgRef.current.d3Force('charge');
      if (chargeForce) {
        chargeForce.strength(graphParams.chargeStrength / 100);
        chargeForce.distanceMax(graphParams.nodeRepulsion);
      }
      
      const centerForce = fgRef.current.d3Force('center');
      if (centerForce) {
        centerForce.strength(graphParams.centerStrength);
      }
      
      // Добавляем коллизионное обнаружение для предотвращения наложения узлов
      // Это будет применено через d3Force callback
      
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphParams, graphData]);

  const handleParamChange = (param, value) => {
    const newValue = Number(value);
    setGraphParams(prev => ({
      ...prev,
      [param]: newValue
    }));
  };

  const resetParams = () => {
    const defaultParams = {
      linkDistance: 200,
      nodeRepulsion: 3000,
      centerStrength: 0.05,
      chargeStrength: -1000,
      nodeSize: 20,
      linkCurvature: 0.3,
      linkOpacity: 0.3
    };
    setGraphParams(defaultParams);
    // Удаляем сохраненные параметры
    try {
      localStorage.removeItem('graphParams');
    } catch (e) {
      console.warn('Failed to clear saved params:', e);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Загрузка графа...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">{error}</div>
        <button 
          className="btn btn-primary" 
          onClick={() => window.location.reload()}
          style={{ marginTop: '1rem' }}
        >
          Перезагрузить
        </button>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="card">
        <div className="error">Нет данных для отображения</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ 
          padding: '1rem', 
          borderBottom: '1px solid #eee', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
        <h2 style={{ margin: 0 }}>Семантический граф</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            Узлов: {graphData.nodes.length}, Связей: {graphData.links.length}
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={autoFit}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            title="Автоматически подогнать граф"
          >
            🔍 Подогнать
          </button>
        </div>
        </div>
        <div 
          style={{ 
            width: '100%', 
            height: '600px',
            border: '1px solid #eee',
            borderRadius: '0 0 8px 8px',
            backgroundColor: '#fff',
            position: 'relative',
            overflow: 'hidden',
            isolation: 'isolate'
          }}
        >
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel={(node) => {
              const desc = node.description ? 
                (node.description.length > 150 ? node.description.substring(0, 150) + '...' : node.description) : 
                'Нет описания';
              const category = node.category ? `<div style="margin-top: 6px; font-size: 11px; color: #666;">Категория: ${node.category}</div>` : '';
              return `
                <div style="
                  padding: 12px; 
                  background: white; 
                  border: 2px solid ${node.color}; 
                  border-radius: 8px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  max-width: 300px;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                ">
                  <div style="
                    font-weight: 600; 
                    font-size: 14px; 
                    color: #333; 
                    margin-bottom: 8px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 6px;
                  ">
                    ${node.name}
                  </div>
                  <div style="
                    font-size: 12px; 
                    color: #555; 
                    line-height: 1.5;
                  ">
                    ${desc}
                  </div>
                  ${category}
                </div>
              `;
            }}
            nodeColor={(node) => node.color}
            nodeVal={(node) => {
              const linkCount = graphData.links.filter(
                link => link.source === node.id || link.target === node.id
              ).length;
              return Math.max(graphParams.nodeSize, Math.min(graphParams.nodeSize * 1.5, graphParams.nodeSize + linkCount * 2));
            }}
            nodeRelSize={graphParams.nodeSize}
            linkDistance={(link) => graphParams.linkDistance}
            linkLabel={(link) => link.label || link.type}
            linkColor={(link) => {
              // Добавляем прозрачность к цвету связи
              const color = link.color || '#95a5a6';
              const opacity = graphParams.linkOpacity || 0.3;
              // Преобразуем hex в rgba
              if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
              }
              return color;
            }}
            linkCurvature={graphParams.linkCurvature || 0.3}
            linkWidth={(link) => {
              // Более тонкие связи для уменьшения визуального шума
              return 1.5;
            }}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={(link) => {
              const color = link.color || '#95a5a6';
              const opacity = (graphParams.linkOpacity || 0.3) * 1.5; // Стрелки немного ярче
              if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${Math.min(1, opacity)})`;
              }
              return color;
            }}
            onNodeClick={handleNodeClick}
            d3Force={(d3) => {
              d3.force('link').distance(graphParams.linkDistance);
              d3.force('charge')
                .strength(graphParams.chargeStrength / 100)
                .distanceMax(graphParams.nodeRepulsion);
              d3.force('center').strength(graphParams.centerStrength);
              // Коллизионное обнаружение для предотвращения наложения узлов
              d3.force('collision')
                .radius((node) => {
                  const baseSize = node.__size || graphParams.nodeSize;
                  return baseSize * 1.5;
                })
                .strength(0.7);
            }}
            cooldownTicks={100}
            onBackgroundClick={() => {}}
            onBackgroundRightClick={() => {}}
            onEngineStop={() => {
              console.log('Graph layout stabilized');
              // Автоматически подгоняем вид после стабилизации
              autoFit();
            }}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name;
              const baseSize = node.__size || graphParams.nodeSize;
              
              // Вычисляем размер узла на основе длины текста
              // Минимальный размер шрифта 8px, чтобы текст всегда был виден
              const fontSize = Math.max(8, Math.min(14, 12 / globalScale));
              ctx.font = `${fontSize}px Arial`;
              const textMetrics = ctx.measureText(label);
              const textWidth = textMetrics.width;
              const textHeight = fontSize * 1.2;
              
              // Определяем размер узла: минимум baseSize, но больше для длинных текстов
              const minNodeSize = baseSize;
              const padding = Math.max(4, 8 / globalScale);
              const maxTextWidthForCircle = (minNodeSize * 2) - (padding * 2);
              
              let nodeWidth, nodeHeight, nodeSize;
              let useRect = false;
              
              if (textWidth > maxTextWidthForCircle || label.length > 12) {
                // Используем прямоугольный узел для длинных текстов
                useRect = true;
                // Сначала определяем ширину на основе текста
                const availableWidth = Math.max(maxTextWidthForCircle * 1.8, textWidth * 1.2);
                const lines = wrapText(ctx, label, availableWidth);
                // Вычисляем максимальную ширину строки
                let maxLineWidth = 0;
                lines.forEach(line => {
                  const lineWidth = ctx.measureText(line).width;
                  if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
                });
                nodeWidth = Math.max(minNodeSize * 2, maxLineWidth + padding * 2);
                nodeHeight = Math.max(minNodeSize * 2, (lines.length * textHeight) + padding * 2);
                nodeSize = null;
              } else {
                // Используем круглый узел для коротких текстов
                nodeSize = Math.max(minNodeSize, Math.min(minNodeSize * 1.8, (textWidth / 2) + padding));
                nodeWidth = nodeSize * 2;
                nodeHeight = nodeSize * 2;
              }
              
              // Рисуем узел
              ctx.fillStyle = node.color;
              if (useRect) {
                // Прямоугольный узел с закругленными углами
                const radius = Math.min(8 / globalScale, nodeHeight / 4);
                roundRect(ctx, node.x - nodeWidth / 2, node.y - nodeHeight / 2, nodeWidth, nodeHeight, radius);
                ctx.fill();
              } else {
                // Круглый узел
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
                ctx.fill();
              }
              
              // Обводка узла
              ctx.strokeStyle = '#2c3e50';
              ctx.lineWidth = Math.max(1, 2 / globalScale);
              if (useRect) {
                const radius = Math.min(8 / globalScale, nodeHeight / 4);
                roundRect(ctx, node.x - nodeWidth / 2, node.y - nodeHeight / 2, nodeWidth, nodeHeight, radius);
              } else {
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
              }
              ctx.stroke();
              
              // Текст на узле (отображаем всегда, но с адаптивным размером)
              ctx.fillStyle = '#fff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              if (useRect) {
                // Многострочный текст для прямоугольных узлов
                const lines = wrapText(ctx, label, nodeWidth - padding * 2);
                const lineHeight = textHeight;
                const startY = node.y - ((lines.length - 1) * lineHeight) / 2;
                
                lines.forEach((line, i) => {
                  ctx.fillText(line, node.x, startY + (i * lineHeight));
                });
              } else {
                // Однострочный текст для круглых узлов
                ctx.fillText(label, node.x, node.y);
              }
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              // Увеличиваем область клика
              const baseSize = node.__size || graphParams.nodeSize;
              ctx.fillStyle = color;
              ctx.beginPath();
              // Используем круглую область клика для всех узлов
              ctx.arc(node.x, node.y, baseSize + 5, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
          />
        </div>
      </div>

      {/* Панель управления параметрами */}
      <div 
        className="card"
        style={{ 
          position: 'relative',
          zIndex: 1000,
          pointerEvents: 'auto',
          isolation: 'isolate'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Настройки графа</h3>
          <button 
            className="btn btn-secondary" 
            onClick={resetParams}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            Сбросить
          </button>
        </div>
        
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem'
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Расстояние между узлами: {graphParams.linkDistance}px
            </label>
            <input
              type="range"
              min="100"
              max="500"
              step="10"
              value={graphParams.linkDistance}
              onChange={(e) => handleParamChange('linkDistance', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Отталкивание узлов: {graphParams.chargeStrength}
            </label>
            <input
              type="range"
              min="-5000"
              max="-100"
              step="50"
              value={graphParams.chargeStrength}
              onChange={(e) => handleParamChange('chargeStrength', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Радиус отталкивания: {graphParams.nodeRepulsion}px
            </label>
            <input
              type="range"
              min="1000"
              max="10000"
              step="100"
              value={graphParams.nodeRepulsion}
              onChange={(e) => handleParamChange('nodeRepulsion', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Притяжение к центру: {graphParams.centerStrength.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={graphParams.centerStrength}
              onChange={(e) => handleParamChange('centerStrength', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Размер узлов: {graphParams.nodeSize}px
            </label>
            <input
              type="range"
              min="10"
              max="40"
              value={graphParams.nodeSize}
              onChange={(e) => handleParamChange('nodeSize', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Изогнутость связей: {(graphParams.linkCurvature || 0.3).toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={graphParams.linkCurvature || 0.3}
              onChange={(e) => handleParamChange('linkCurvature', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
              Прозрачность связей: {((graphParams.linkOpacity || 0.3) * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={graphParams.linkOpacity || 0.3}
              onChange={(e) => handleParamChange('linkOpacity', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default GraphView;
