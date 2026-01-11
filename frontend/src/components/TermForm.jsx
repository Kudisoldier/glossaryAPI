import { useState, useEffect } from 'react';
import { termsAPI, relationsAPI } from '../api';
import TermSelector from './TermSelector';

function TermForm({ onSuccess, onCancel, initialTerm = null, allTerms = [] }) {
  const [formData, setFormData] = useState({
    keyword: initialTerm?.keyword || '',
    description: initialTerm?.description || '',
    category: initialTerm?.category || '',
  });
  const [relationData, setRelationData] = useState({
    term_to_keyword: '',
    relation_type: 'related',
    description: ''
  });
  const [addRelation, setAddRelation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (initialTerm) {
        await termsAPI.update(initialTerm.keyword, formData);
      } else {
        // Create term first
        const response = await termsAPI.create(formData);
        const createdTerm = response.data;
        
        // If relation is specified, create it
        if (addRelation && relationData.term_to_keyword) {
          try {
            await relationsAPI.create(createdTerm.keyword, relationData);
          } catch (relError) {
            console.warn('Failed to create relation:', relError);
            // Don't fail the whole operation if relation creation fails
          }
        }
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при сохранении термина');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>{initialTerm ? 'Редактировать термин' : 'Создать новый термин'}</h2>
      
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="keyword">Ключевое слово *</label>
          <input
            id="keyword"
            type="text"
            value={formData.keyword}
            onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
            required
            disabled={!!initialTerm}
            placeholder="Например: API"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Описание *</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            placeholder="Подробное описание термина..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Категория</label>
          <input
            id="category"
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Например: Технологии"
          />
        </div>

        {!initialTerm && (
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                id="addRelation"
                checked={addRelation}
                onChange={(e) => setAddRelation(e.target.checked)}
                style={{ marginRight: '0.5rem', width: 'auto' }}
              />
              <label htmlFor="addRelation" style={{ margin: 0, cursor: 'pointer' }}>
                Создать связь с существующим термином
              </label>
            </div>
            
            {addRelation && (
              <div style={{ 
                padding: '1rem', 
                background: '#f9f9f9', 
                borderRadius: '6px',
                marginTop: '0.5rem'
              }}>
                <div className="form-group">
                  <label>Связать с термином *</label>
                  <TermSelector
                    value={relationData.term_to_keyword}
                    onChange={(keyword) => setRelationData({ ...relationData, term_to_keyword: keyword })}
                    terms={allTerms}
                    placeholder="Выберите термин для связи..."
                    required={addRelation}
                  />
                </div>
                <div className="form-group">
                  <label>Тип связи</label>
                  <select
                    value={relationData.relation_type}
                    onChange={(e) => setRelationData({ ...relationData, relation_type: e.target.value })}
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
                  <label>Описание связи</label>
                  <input
                    type="text"
                    value={relationData.description}
                    onChange={(e) => setRelationData({ ...relationData, description: e.target.value })}
                    placeholder="Описание связи (необязательно)"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="button-group">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Сохранение...' : (initialTerm ? 'Сохранить' : 'Создать')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

export default TermForm;
