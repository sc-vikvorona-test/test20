const IngredientList = ({ ingredients, servingsMultiplier = 1 }) => {
  if (!ingredients || ingredients.length === 0) {
    return <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No ingredients listed</p>;
  }

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '10px',
    padding: 0,
    margin: 0,
    listStyle: 'none',
  };

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    border: '1px solid #F3F4F6',
  };

  const bulletStyle = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#2D6A4F',
    flexShrink: 0,
  };

  const amountStyle = {
    fontSize: '14px',
    fontWeight: '700',
    color: '#2D6A4F',
    minWidth: '50px',
    flexShrink: 0,
  };

  const nameStyle = {
    fontSize: '14px',
    color: '#374151',
    fontWeight: '500',
  };

  return (
    <ul style={containerStyle}>
      {ingredients.map((ingredient, index) => {
        const amount = Math.round(ingredient.amount * servingsMultiplier * 10) / 10;
        return (
          <li key={index} style={itemStyle}>
            <div style={bulletStyle} />
            <span style={amountStyle}>{amount} {ingredient.unit}</span>
            <span style={nameStyle}>{ingredient.name}</span>
          </li>
        );
      })}
    </ul>
  );
};

export default IngredientList;