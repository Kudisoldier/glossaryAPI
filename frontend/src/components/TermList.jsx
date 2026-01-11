import { useState } from 'react';
import { termsAPI } from '../api';

function TermList({ terms, loading, onTermSelect, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = [...new Set(terms.map(t => t.category).filter(Boolean))];

  const filteredTerms = terms.filter(term => {
    const matchesSearch = term.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         term.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (keyword, e) => {
    e.stopPropagation();
    if (!confirm(`Удалить термин "${keyword}"?`)) return;

    try {
      await termsAPI.delete(keyword);
      onRefresh();
    } catch (error) {
      alert('Ошибка при удалении термина');
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Поиск терминов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#ddd';
              e.target.style.boxShadow = 'none';
            }}
          />
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ 
                minWidth: '200px',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                background: 'white',
                transition: 'border-color 0.2s',
                cursor: 'pointer'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#ddd';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">Все категории</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ color: '#666', fontSize: '0.9rem' }}>
          Найдено терминов: {filteredTerms.length}
        </div>
      </div>

      {filteredTerms.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            Термины не найдены
          </div>
        </div>
      ) : (
        filteredTerms.map(term => (
          <div
            key={term.id}
            className="card"
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => onTermSelect(term)}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ marginBottom: '0.5rem', color: '#667eea' }}>
                  {term.keyword}
                  {term.category && (
                    <span style={{
                      marginLeft: '0.75rem',
                      fontSize: '0.75rem',
                      background: '#667eea',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontWeight: 'normal'
                    }}>
                      {term.category}
                    </span>
                  )}
                </h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  {term.description}
                </p>
              </div>
              <button
                className="btn btn-danger"
                onClick={(e) => handleDelete(term.keyword, e)}
                style={{ marginLeft: '1rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Удалить
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TermList;
