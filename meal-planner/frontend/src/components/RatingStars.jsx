import { useState } from 'react';

const RatingStars = ({ value = 0, onChange, size = 16, showCount = false, count = 0 }) => {
  const [hovered, setHovered] = useState(0);

  const displayValue = hovered || value;

  const getStarType = (starIndex) => {
    if (displayValue >= starIndex) return 'full';
    if (displayValue >= starIndex - 0.5) return 'half';
    return 'empty';
  };

  const starContainerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
  };

  const starStyle = (type) => ({
    width: `${size}px`,
    height: `${size}px`,
    cursor: onChange ? 'pointer' : 'default',
    color: type === 'empty' ? '#D1D5DB' : '#F59E0B',
    fontSize: `${size}px`,
    lineHeight: 1,
    userSelect: 'none',
    transition: 'color 0.1s',
  });

  const countStyle = {
    fontSize: `${size - 2}px`,
    color: '#6B7280',
    marginLeft: '4px',
  };

  const renderStar = (index) => {
    const type = getStarType(index);
    if (type === 'full') {
      return (
        <span
          key={index}
          style={starStyle('full')}
          onClick={() => onChange && onChange(index)}
          onMouseEnter={() => onChange && setHovered(index)}
          onMouseLeave={() => onChange && setHovered(0)}
        >
          ★
        </span>
      );
    }
    if (type === 'half') {
      return (
        <span
          key={index}
          style={{ ...starStyle('half'), position: 'relative', display: 'inline-block' }}
          onClick={() => onChange && onChange(index)}
          onMouseEnter={() => onChange && setHovered(index)}
          onMouseLeave={() => onChange && setHovered(0)}
        >
          <span style={{ color: '#D1D5DB' }}>★</span>
          <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: '50%', color: '#F59E0B' }}>★</span>
        </span>
      );
    }
    return (
      <span
        key={index}
        style={starStyle('empty')}
        onClick={() => onChange && onChange(index)}
        onMouseEnter={() => onChange && setHovered(index)}
        onMouseLeave={() => onChange && setHovered(0)}
      >
        ★
      </span>
    );
  };

  return (
    <span style={starContainerStyle}>
      {[1, 2, 3, 4, 5].map((i) => renderStar(i))}
      {showCount && (
        <span style={countStyle}>({count})</span>
      )}
    </span>
  );
};

export default RatingStars;
