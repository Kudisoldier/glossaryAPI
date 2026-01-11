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
      linkDistance: 150,
      nodeRepulsion: 2000,
      centerStrength: 0.1,
      chargeStrength: -500,
      nodeSize: 20
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
        
        // Автоматически подгоняем вид после загрузки данных
        setTimeout(() => {
          if (fgRef.current) {
            fgRef.current.zoomToFit(400, 50, (node) => true);
          }
        }, 500);
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

  // Применяем параметры к графу при их изменении
  useEffect(() => {
    if (fgRef.current && graphData) {
      fgRef.current.d3Force('link')?.distance(graphParams.linkDistance);
      fgRef.current.d3Force('charge')
        ?.strength(graphParams.chargeStrength / 100)
        ?.distanceMax(graphParams.nodeRepulsion);
      fgRef.current.d3Force('center')?.strength(graphParams.centerStrength);
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphParams, graphData, autoFit]);

  const handleParamChange = (param, value) => {
    const newValue = Number(value);
    setGraphParams(prev => ({
      ...prev,
      [param]: newValue
    }));
  };

  const resetParams = () => {
    const defaultParams = {
      linkDistance: 150,
      nodeRepulsion: 2000,
      centerStrength: 0.1,
      chargeStrength: -500,
      nodeSize: 20
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
            linkColor={(link) => link.color}
            linkWidth={2}
            linkDirectionalArrowLength={8}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={(link) => link.color}
            onNodeClick={handleNodeClick}
            d3Force={(d3) => {
              d3.force('link').distance(graphParams.linkDistance);
              d3.force('charge')
                .strength(graphParams.chargeStrength / 100)
                .distanceMax(graphParams.nodeRepulsion);
              d3.force('center').strength(graphParams.centerStrength);
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
              const size = node.__size || graphParams.nodeSize;
              
              // Рисуем круглый узел
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.fill();
              
              // Обводка узла
              ctx.strokeStyle = '#2c3e50';
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
              
              // Текст на узле (только если масштаб достаточный)
              if (globalScale > 0.5) {
                ctx.fillStyle = '#fff';
                ctx.font = `${Math.max(10, 12 / globalScale)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Обрезаем текст если он слишком длинный
                const maxLength = size * 1.5;
                let displayText = label;
                if (ctx.measureText(displayText).width > maxLength) {
                  displayText = label.substring(0, Math.floor(label.length * maxLength / ctx.measureText(label).width)) + '...';
                }
                
                ctx.fillText(displayText, node.x, node.y);
              }
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              // Увеличиваем область клика
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, (node.__size || graphParams.nodeSize) + 5, 0, 2 * Math.PI, false);
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
              min="50"
              max="300"
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
              min="-2000"
              max="-100"
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
              min="500"
              max="5000"
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
        </div>
      </div>
    </div>
  );
}

export default GraphView;
