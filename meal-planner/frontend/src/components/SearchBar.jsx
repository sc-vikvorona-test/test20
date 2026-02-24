import { useState, useEffect, useRef } from 'react';

const SearchBar = ({ value, onChange, placeholder = 'Search...' }) => {
  const [localValue, setLocalValue] = useState(value || '');
  const debounceRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  const containerStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '600px',
  };

  const iconStyle = {
    position: 'absolute',
    left: '14px',
    fontSize: '18px',
    color: '#9CA3AF',
    pointerEvents: 'none',
    lineHeight: 1,
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 44px 12px 44px',
    borderRadius: '50px',
    border: '2px solid #E5E7EB',
    fontSize: '15px',
    outline: 'none',
    color: '#1F2937',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  };

  const clearBtnStyle = {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9CA3AF',
    fontSize: '18px',
    lineHeight: 1,
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
  };

  return (
    <div style={containerStyle}>
      <span style={iconStyle}>&#x1F50D;</span>
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = '#2D6A4F';
          e.target.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#E5E7EB';
          e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        }}
      />
      {localValue && (
        <button style={clearBtnStyle} onClick={handleClear} title="Clear search">×</button>
      )}
    </div>
  );
};

export default SearchBar;