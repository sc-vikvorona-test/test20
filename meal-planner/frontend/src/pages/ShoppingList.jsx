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

const CUSTOM_CATEGORIES = ['produce', 'dairy', 'meat', 'pantry', 'spices', 'frozen', 'beverages'];

const ShoppingList = () => {
  const navigate = useNavigate();
  const { token, currentWeek, shoppingItems, setShoppingItems } = useStore();
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [customItems, setCustomItems] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', amount: '', unit: '', category: 'produce' });
  const [customFormError, setCustomFormError] = useState('');

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

  const toggleItem = (categoryKey, itemIndex, isCustom = false) => {
    const key = isCustom ? `custom-${categoryKey}-${itemIndex}` : `${categoryKey}-${itemIndex}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getTotalItemCount = () => {
    const generatedCount = total;
    const customCount = Object.values(customItems).reduce((sum, arr) => sum + arr.length, 0);
    return generatedCount + customCount;
  };

  const getCheckedCount = () => Object.values(checkedItems).filter(Boolean).length;

  const handleAddCustomItem = () => {
    if (!customForm.name.trim()) {
      setCustomFormError('Item name is required');
      return;
    }
    setCustomFormError('');
    const { name, amount, unit, category } = customForm;
    setCustomItems((prev) => ({
      ...prev,
      [category]: [...(prev[category] || []), { name: name.trim(), amount: amount || '1', unit: unit.trim() || 'item' }],
    }));
    setCustomForm({ name: '', amount: '', unit: '', category: customForm.category });
    setShowAddForm(false);
  };

  const handleExportText = () => {
    const lines = ['SHOPPING LIST', '=============', ''];
    const allCategories = new Set([...Object.keys(shoppingItems), ...Object.keys(customItems)]);

    for (const category of allCategories) {
      const generatedInCat = shoppingItems[category] || [];
      const customInCat = customItems[category] || [];
      const allInCat = [...generatedInCat, ...customInCat];
      if (allInCat.length === 0) continue;

      lines.push(`${(CATEGORY_ICONS[category] || '') + ' ' + category.toUpperCase()}`);
      for (const item of allInCat) {
        lines.push(`  - ${item.name}: ${item.amount} ${item.unit}`);
      }
      lines.push('');
    }

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shopping-list.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

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
    marginBottom: '24px',
    overflow: 'hidden',
  };

  const totalCount = getTotalItemCount();
  const checkedCount = getCheckedCount();

  const progressFillStyle = {
    height: '100%',
    backgroundColor: '#2D6A4F',
    borderRadius: '8px',
    transition: 'width 0.3s ease',
    width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`,
  };

  const categoryCardStyle = {
    backgroundColor: '#fff',
    borderRadius: '12px',
    marginBottom: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  };

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
    cursor: 'pointer',
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

  const addFormStyle = {
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
  };

  if (!token) return null;

  const allCategories = new Set([...Object.keys(shoppingItems), ...Object.keys(customItems)]);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#2D6A4F', margin: '0 0 8px 0' }}>Shopping List</h1>
          <p style={{ color: '#6B7280', margin: 0 }}>
            {totalCount > 0 ? `${checkedCount} of ${totalCount} items checked` : 'Generate from your current meal plan'}
          </p>
        </div>
        <div style={buttonGroupStyle}>
          <button style={btnStyle(false)} onClick={() => setShowAddForm(!showAddForm)}>+ Add Item</button>
          <button style={btnStyle(false)} onClick={handleExportText}>⬇ Export</button>
          <button style={btnStyle(false)} onClick={() => window.print()}>🖨 Print</button>
          <button style={btnStyle(true)} onClick={generateShoppingList}>↻ Regenerate</button>
        </div>
      </div>

      {showAddForm && (
        <div style={addFormStyle}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#2D6A4F', marginBottom: '16px', marginTop: 0 }}>Add Custom Item</h3>
          {customFormError && (
            <p style={{ color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>{customFormError}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Item Name *</label>
              <input
                type="text"
                placeholder="e.g. Olive oil"
                value={customForm.name}
                onChange={(e) => setCustomForm((p) => ({ ...p, name: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Amount</label>
              <input
                type="text"
                placeholder="e.g. 2"
                value={customForm.amount}
                onChange={(e) => setCustomForm((p) => ({ ...p, amount: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Unit</label>
              <input
                type="text"
                placeholder="e.g. cups"
                value={customForm.unit}
                onChange={(e) => setCustomForm((p) => ({ ...p, unit: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Category</label>
              <select
                value={customForm.category}
                onChange={(e) => setCustomForm((p) => ({ ...p, category: e.target.value }))}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
              >
                {CUSTOM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={btnStyle(true)} onClick={handleAddCustomItem}>Add to List</button>
            <button style={btnStyle(false)} onClick={() => { setShowAddForm(false); setCustomFormError(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {totalCount > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
            <span>{checkedCount} checked</span>
            <span>{Math.round((checkedCount / totalCount) * 100)}% complete</span>
          </div>
          <div style={progressBarStyle}>
            <div style={progressFillStyle} />
          </div>
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

      {!loading && !error && allCategories.size === 0 && (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
          <p style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Your shopping list is empty</p>
          <p style={{ fontSize: '15px', marginBottom: '24px' }}>Add recipes to your meal plan to generate a shopping list</p>
          <button style={btnStyle(true)} onClick={() => navigate('/planner')}>Go to Meal Planner →</button>
        </div>
      )}

      {!loading && allCategories.size > 0 && (
        <div>
          {Array.from(allCategories).sort().map((category) => {
            const generatedInCat = shoppingItems[category] || [];
            const customInCat = customItems[category] || [];
            const itemCount = generatedInCat.length + customInCat.length;
            if (itemCount === 0) return null;

            return (
              <div key={category} style={categoryCardStyle}>
                <div style={categoryHeaderStyle(category)}>
                  <span style={{ fontSize: '20px' }}>{CATEGORY_ICONS[category] || '🛍'}</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', textTransform: 'capitalize' }}>{category}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#6B7280', backgroundColor: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </span>
                </div>
                {generatedInCat.map((item, index) => {
                  const key = `${category}-${index}`;
                  const isChecked = checkedItems[key];
                  return (
                    <div key={`gen-${index}`} style={itemRowStyle(isChecked)} onClick={() => toggleItem(category, index)}>
                      <div style={checkboxStyle(isChecked)}>
                        {isChecked && <span style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>✓</span>}
                      </div>
                      <span style={{ flex: 1, fontSize: '15px', color: '#1F2937', textDecoration: isChecked ? 'line-through' : 'none' }}>{item.name}</span>
                      <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>{item.amount} {item.unit}</span>
                    </div>
                  );
                })}
                {customInCat.map((item, index) => {
                  const key = `custom-${category}-${index}`;
                  const isChecked = checkedItems[key];
                  return (
                    <div key={`custom-${index}`} style={itemRowStyle(isChecked)} onClick={() => toggleItem(category, index, true)}>
                      <div style={checkboxStyle(isChecked)}>
                        {isChecked && <span style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>✓</span>}
                      </div>
                      <span style={{ flex: 1, fontSize: '15px', color: '#1F2937', textDecoration: isChecked ? 'line-through' : 'none' }}>{item.name}</span>
                      <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>{item.amount} {item.unit}</span>
                      <span style={{ fontSize: '10px', color: '#F4A261', fontWeight: '600', marginLeft: '8px', backgroundColor: '#FFF7ED', padding: '2px 6px', borderRadius: '6px' }}>custom</span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '14px' }}>
            {checkedCount === totalCount && totalCount > 0 ? (
              <div style={{ color: '#2D6A4F', fontWeight: '600', fontSize: '16px' }}>All items checked! Happy shopping!</div>
            ) : (
              <span>{totalCount - checkedCount} items remaining</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingList;
