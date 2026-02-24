import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import { getShoppingList } from '../services/api.js';

const CATEGORY_ICONS = {
  produce: '🥬',
  dairy: '🧀',
  meat: '🥩',
  pantry: '🥫',
  spices: '🌿',
  frozen: '🧊',
  beverages: '🥤',
};

const CATEGORY_COLORS = {
  produce: '#D1FAE5',
  dairy: '#FEF9C3',
  meat: '#FFE4E6',
  pantry: '#E0E7FF',
  spices: '#F3E8FF',
  frozen: '#E0F2FE',
  beverages: '#FDE8D8',
};

const ShoppingList = () => {
  const navigate = useNavigate();
  const { token, currentWeek, shoppingItems, setShoppingItems } = useStore();
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    generateShoppingList();
  }, [token, currentWeek]);

  const generateShoppingList = async () => {
    setLoading(true);
    setError(null);
    try {
      const weekStartStr = currentWeek.toISOString().split('T')[0];
      const res = await getShoppingList(weekStartStr);
      setShoppingItems(res.data.categories || {});
      setTotal(res.data.total || 0);
      setCheckedItems({});
    } catch {
      setError('Failed to generate shopping list. Make sure you have a meal plan for the current week.');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (categoryKey, itemIndex) => {
    const key = `${categoryKey}-${itemIndex}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getCheckedCount = () => Object.values(checkedItems).filter(Boolean).length;

  const containerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 24px',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  };

  const btnStyle = (primary) => ({
    backgroundColor: primary ? '#2D6A4F' : '#fff',
    color: primary ? '#FEFAE0' : '#374151',
    border: primary ? 'none' : '1px solid #D1D5DB',
    padding: '10px 18px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  });

  const progressBarStyle = {
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
    height: '8px',
    marginBottom: '32px',
    overflow: 'hidden',
  };

  const progressFillStyle = {
    height: '100%',
    backgroundColor: '#2D6A4F',
    borderRadius: '8px',
    transition: 'width 0.3s ease',
    width: `${total > 0 ? (getCheckedCount() / total) * 100 : 0}%`,
  };

  const categoryCardStyle = (category) => ({
    backgroundColor: '#fff',
    borderRadius: '12px',
    marginBottom: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  });

  const categoryHeaderStyle = (category) => ({
    backgroundColor: CATEGORY_COLORS[category] || '#F9FAFB',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  });

  const itemRowStyle = (checked) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #F3F4F6',
    opacity: checked ? 0.5 : 1,
    transition: 'opacity 0.2s',
  });

  const checkboxStyle = (checked) => ({
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: checked ? 'none' : '2px solid #D1D5DB',
    backgroundColor: checked ? '#2D6A4F' : '#fff',
    marginRight: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s',
  });

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '80px 24px',
    color: '#9CA3AF',
  };

  if (!token) return null;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#2D6A4F', margin: '0 0 8px 0' }}>Shopping List</h1>
          <p style={{ color: '#6B7280', margin: 0 }}>
            {total > 0 ? `${getCheckedCount()} of ${total} items checked` : 'Generate from your current meal plan'}
          </p>
        </div>
        <div style={buttonGroupStyle}>
          <button style={btnStyle(false)} onClick={() => window.print()}>🖨 Print</button>
          <button style={btnStyle(true)} onClick={generateShoppingList}>↻ Regenerate</button>
        </div>
      </div>

      {total > 0 && (
        <div style={progressBarStyle}>
          <div style={progressFillStyle} />
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ color: '#DC2626', margin: '0 0 12px 0', fontWeight: '600' }}>No shopping list available</p>
          <p style={{ color: '#EF4444', margin: '0 0 16px 0', fontSize: '14px' }}>{error}</p>
          <button style={{ ...btnStyle(false), borderColor: '#2D6A4F', color: '#2D6A4F' }} onClick={() => navigate('/planner')}>Go to Meal Planner →</button>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', fontSize: '48px' }}>⏳</div>
      )}

      {!loading && !error && Object.keys(shoppingItems).length === 0 && (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
          <p style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Your shopping list is empty</p>
          <p style={{ fontSize: '15px', marginBottom: '24px' }}>Add recipes to your meal plan to generate a shopping list</p>
          <button style={btnStyle(true)} onClick={() => navigate('/planner')}>Go to Meal Planner →</button>
        </div>
      )}

      {!loading && Object.keys(shoppingItems).length > 0 && (
        <div>
          {Object.entries(shoppingItems).map(([category, items]) => (
            <div key={category} style={categoryCardStyle(category)}>
              <div style={categoryHeaderStyle(category)}>
                <span style={{ fontSize: '20px' }}>{CATEGORY_ICONS[category] || '🛍'}</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', textTransform: 'capitalize' }}>{category}</span>
                <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#6B7280', backgroundColor: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '12px' }}>{items.length} items</span>
              </div>
              {items.map((item, index) => {
                const key = `${category}-${index}`;
                const isChecked = checkedItems[key];
                return (
                  <div key={index} style={itemRowStyle(isChecked)} onClick={() => toggleItem(category, index)}>
                    <div style={checkboxStyle(isChecked)}>
                      {isChecked && <span style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>✓</span>}
                    </div>
                    <span style={{ flex: 1, fontSize: '15px', color: '#1F2937', textDecoration: isChecked ? 'line-through' : 'none' }}>{item.name}</span>
                    <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>{item.amount} {item.unit}</span>
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '14px' }}>
            {getCheckedCount() === total && total > 0 ? (
              <div style={{ color: '#2D6A4F', fontWeight: '600', fontSize: '16px' }}>🎉 All items checked! Happy shopping!</div>
            ) : (
              <span>{total - getCheckedCount()} items remaining</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingList;