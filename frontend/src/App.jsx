import { useState, useEffect } from 'react';
import { termsAPI, graphAPI } from './api';
import TermForm from './components/TermForm';
import TermList from './components/TermList';
import GraphView from './components/GraphView';
import TermDetails from './components/TermDetails';
import './App.css';

function App() {
  const [view, setView] = useState('graph'); // 'graph', 'list', 'create'
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      setLoading(true);
      const response = await termsAPI.getAll();
      setTerms(response.data);
    } catch (error) {
      console.error('Error loading terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTermCreated = () => {
    loadTerms();
    setView('graph');
  };

  const handleTermSelect = (term) => {
    setSelectedTerm(term);
    setView('details');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📚 Глоссарий терминов</h1>
        <nav className="nav">
          <button 
            className={view === 'graph' ? 'active' : ''} 
            onClick={() => setView('graph')}
          >
            Граф
          </button>
          <button 
            className={view === 'list' ? 'active' : ''} 
            onClick={() => setView('list')}
          >
            Список
          </button>
          <button 
            className={view === 'create' ? 'active' : ''} 
            onClick={() => setView('create')}
          >
            + Создать
          </button>
        </nav>
      </header>

      <main className="app-main">
        {view === 'graph' && (
          <GraphView 
            onTermSelect={handleTermSelect}
            terms={terms}
          />
        )}
        {view === 'list' && (
          <TermList 
            terms={terms}
            loading={loading}
            onTermSelect={handleTermSelect}
            onRefresh={loadTerms}
          />
        )}
        {view === 'create' && (
          <TermForm 
            onSuccess={handleTermCreated}
            onCancel={() => setView('graph')}
            allTerms={terms}
          />
        )}
        {view === 'details' && selectedTerm && (
          <TermDetails 
            term={selectedTerm}
            onClose={() => {
              setSelectedTerm(null);
              setView('graph');
            }}
            onUpdate={loadTerms}
            allTerms={terms}
          />
        )}
      </main>
    </div>
  );
}

export default App;
