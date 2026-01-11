import { useState, useEffect } from 'react';
import { termsAPI, sourcesAPI, relationsAPI } from '../api';
import TermForm from './TermForm';
import TermSelector from './TermSelector';

function TermDetails({ term, onClose, onUpdate, allTerms = [] }) {
  const [editMode, setEditMode] = useState(false);
  const [sources, setSources] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [newSource, setNewSource] = useState({ title: '', url: '', author: '', year: '' });
  const [newRelation, setNewRelation] = useState({ term_to_keyword: '', relation_type: 'related', description: '' });

  useEffect(() => {
    loadDetails();
  }, [term]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const [termResponse, sourcesResponse, relationsResponse] = await Promise.all([
        termsAPI.getByKeyword(term.keyword),
        sourcesAPI.getByTerm(term.keyword),
        relationsAPI.getByTerm(term.keyword)
      ]);
      setSources(sourcesResponse.data);
      setRelations(relationsResponse.data);
    } catch (error) {
      console.error('Error loading details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    try {
      await sourcesAPI.create(term.keyword, newSource);
      setNewSource({ title: '', url: '', author: '', year: '' });
      setShowSourceForm(false);
      loadDetails();
    } catch (error) {
      alert('Ошибка при добавлении источника');
    }
  };

  const handleAddRelation = async (e) => {
    e.preventDefault();
    try {
      await relationsAPI.create(term.keyword, newRelation);
      setNewRelation({ term_to_keyword: '', relation_type: 'related', description: '' });
      setShowRelationForm(false);
      loadDetails();
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.detail || 'Ошибка при добавлении связи');
    }
  };

  const handleDeleteSource = async (id) => {
    if (!confirm('Удалить источник?')) return;
    try {
      await sourcesAPI.delete(id);
      loadDetails();
    } catch (error) {
      alert('Ошибка при удалении источника');
    }
  };

  const handleDeleteRelation = async (id) => {
    if (!confirm('Удалить связь?')) return;
    try {
      await relationsAPI.delete(id);
      loadDetails();
      onUpdate();
    } catch (error) {
      alert('Ошибка при удалении связи');
    }
  };

  if (editMode) {
    return (
      <TermForm
        initialTerm={term}
        onSuccess={() => {
          setEditMode(false);
          onUpdate();
        }}
        onCancel={() => setEditMode(false)}
        allTerms={allTerms}
      />
    );
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.5rem', color: '#667eea' }}>
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
            </h2>
            <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '1rem' }}>
              {term.description}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
              Редактировать
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Связи ({relations.length})</h3>
            <button className="btn btn-primary" onClick={() => setShowRelationForm(!showRelationForm)} style={{ padding: '0.5rem 1rem' }}>
              {showRelationForm ? 'Отмена' : '+ Добавить связь'}
            </button>
          </div>

          {showRelationForm && (
            <form onSubmit={handleAddRelation} style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
              <div className="form-group">
                <label>Термин для связи *</label>
                <TermSelector
                  value={newRelation.term_to_keyword}
                  onChange={(keyword) => setNewRelation({ ...newRelation, term_to_keyword: keyword })}
                  terms={allTerms}
                  excludeTerm={term.keyword}
                  placeholder="Выберите термин для связи..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Тип связи</label>
                <select
                  value={newRelation.relation_type}
                  onChange={(e) => setNewRelation({ ...newRelation, relation_type: e.target.value })}
                >
                  <option value="related">Связан</option>
                  <option value="synonym">Синоним</option>
                  <option value="antonym">Антоним</option>
                  <option value="parent">Родитель</option>
                  <option value="child">Дочерний</option>
                  <option value="see_also">См. также</option>
                </select>
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input
                  type="text"
                  value={newRelation.description}
                  onChange={(e) => setNewRelation({ ...newRelation, description: e.target.value })}
                  placeholder="Описание связи (необязательно)"
                />
              </div>
              <button type="submit" className="btn btn-primary">Добавить</button>
            </form>
          )}

          {relations.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>Нет связей</p>
          ) : (
            relations.map(rel => (
              <div key={rel.id} style={{ 
                padding: '0.75rem', 
                marginBottom: '0.5rem', 
                background: '#f9f9f9', 
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{
                    background: '#667eea',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    marginRight: '0.5rem'
                  }}>
                    {rel.relation_type}
                  </span>
                  <strong>{rel.term_from_keyword === term.keyword ? rel.term_to_keyword : rel.term_from_keyword}</strong>
                  {rel.description && <span style={{ color: '#666', marginLeft: '0.5rem' }}>— {rel.description}</span>}
                </div>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteRelation(rel.id)}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                >
                  Удалить
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Источники ({sources.length})</h3>
            <button className="btn btn-primary" onClick={() => setShowSourceForm(!showSourceForm)} style={{ padding: '0.5rem 1rem' }}>
              {showSourceForm ? 'Отмена' : '+ Добавить источник'}
            </button>
          </div>

          {showSourceForm && (
            <form onSubmit={handleAddSource} style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={newSource.title}
                  onChange={(e) => setNewSource({ ...newSource, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>URL</label>
                <input
                  type="url"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Автор</label>
                  <input
                    type="text"
                    value={newSource.author}
                    onChange={(e) => setNewSource({ ...newSource, author: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Год</label>
                  <input
                    type="number"
                    value={newSource.year}
                    onChange={(e) => setNewSource({ ...newSource, year: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Добавить</button>
            </form>
          )}

          {sources.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>Нет источников</p>
          ) : (
            sources.map(source => (
              <div key={source.id} style={{ 
                padding: '0.75rem', 
                marginBottom: '0.5rem', 
                background: '#f9f9f9', 
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start'
              }}>
                <div>
                  <strong>{source.title}</strong>
                  {source.author && <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>Автор: {source.author}</div>}
                  {source.year && <span style={{ color: '#666', fontSize: '0.9rem' }}> ({source.year})</span>}
                  {source.url && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
                        {source.url}
                      </a>
                    </div>
                  )}
                </div>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteSource(source.id)}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                >
                  Удалить
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TermDetails;
