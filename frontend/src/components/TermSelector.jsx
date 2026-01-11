import { useState, useEffect, useRef } from 'react';

function TermSelector({ 
  value, 
  onChange, 
  terms = [], 
  excludeTerm = null,
  placeholder = "Начните вводить название термина...",
  required = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Find selected term by keyword
    if (value) {
      const term = terms.find(t => t.keyword === value);
      setSelectedTerm(term || null);
      setSearchTerm(term ? term.keyword : value);
    } else {
      setSelectedTerm(null);
      setSearchTerm('');
    }
  }, [value, terms]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredTerms = terms.filter(term => {
    if (excludeTerm && term.keyword === excludeTerm) return false;
    if (!searchTerm) return false;
    const searchLower = searchTerm.toLowerCase();
    return term.keyword.toLowerCase().includes(searchLower) ||
           term.description.toLowerCase().includes(searchLower);
  }).slice(0, 10); // Limit to 10 results

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setShowDropdown(true);
    setSelectedTerm(null);
    if (!newValue) {
      onChange('');
    }
  };

  const handleSelectTerm = (term) => {
    setSelectedTerm(term);
    setSearchTerm(term.keyword);
    setShowDropdown(false);
    onChange(term.keyword);
  };

  const handleInputFocus = () => {
    if (searchTerm) {
      setShowDropdown(true);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedTerm(null);
    setShowDropdown(false);
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          required={required}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '0.75rem',
            paddingRight: selectedTerm ? '2.5rem' : '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => {
            handleInputFocus();
            e.target.style.borderColor = '#667eea';
            e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#ddd';
            e.target.style.boxShadow = 'none';
          }}
        />
        {selectedTerm && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              color: '#999',
              padding: '0.25rem',
              lineHeight: 1
            }}
            title="Очистить"
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && filteredTerms.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {filteredTerms.map(term => (
            <div
              key={term.id}
              onClick={() => handleSelectTerm(term)}
              style={{
                padding: '0.75rem',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ fontWeight: 500, color: '#667eea', marginBottom: '0.25rem' }}>
                {term.keyword}
                {term.category && (
                  <span style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem',
                    background: '#667eea',
                    color: 'white',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '10px',
                    fontWeight: 'normal'
                  }}>
                    {term.category}
                  </span>
                )}
              </div>
              {term.description && (
                <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.4' }}>
                  {term.description.length > 100 
                    ? term.description.substring(0, 100) + '...' 
                    : term.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showDropdown && searchTerm && filteredTerms.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            padding: '1rem',
            textAlign: 'center',
            color: '#666'
          }}
        >
          Термины не найдены
        </div>
      )}
    </div>
  );
}

export default TermSelector;
