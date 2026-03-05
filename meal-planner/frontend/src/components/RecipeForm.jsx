import { useState } from 'react';

const CUISINES = ['Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian', 'French', 'Thai', 'Japanese', 'Greek', 'Middle Eastern', 'Other'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 'keto', 'paleo'];

const defaultIngredient = () => ({ name: '', amount: '', unit: '' });
const defaultInstruction = () => '';

const RecipeForm = ({ initialData, onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    cuisine: initialData?.cuisine || 'Other',
    difficulty: initialData?.difficulty || 'Medium',
    dietary: initialData?.dietary || [],
    prepTime: initialData?.prepTime || 0,
    cookTime: initialData?.cookTime || 0,
    servings: initialData?.servings || 1,
    imageUrl: initialData?.imageUrl || '',
    isPublic: initialData?.isPublic !== undefined ? initialData.isPublic : true,
    ingredients: initialData?.ingredients?.length
      ? initialData.ingredients.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit }))
      : [defaultIngredient()],
    instructions: initialData?.instructions?.length
      ? [...initialData.instructions]
      : [''],
    nutrition: {
      calories: initialData?.nutrition?.calories || 0,
      protein: initialData?.nutrition?.protein || 0,
      carbs: initialData?.nutrition?.carbs || 0,
      fat: initialData?.nutrition?.fat || 0,
    },
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (form.ingredients.filter((i) => i.name.trim()).length === 0) errs.ingredients = 'At least one ingredient is required';
    if (form.instructions.filter((i) => i.trim()).length === 0) errs.instructions = 'At least one instruction step is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleNutritionChange = (field, value) => {
    setForm((prev) => ({ ...prev, nutrition: { ...prev.nutrition, [field]: parseFloat(value) || 0 } }));
  };

  const handleDietaryToggle = (option) => {
    setForm((prev) => ({
      ...prev,
      dietary: prev.dietary.includes(option)
        ? prev.dietary.filter((d) => d !== option)
        : [...prev.dietary, option],
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.ingredients];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, ingredients: updated };
    });
    if (errors.ingredients) setErrors((prev) => ({ ...prev, ingredients: undefined }));
  };

  const addIngredient = () => {
    setForm((prev) => ({ ...prev, ingredients: [...prev.ingredients, defaultIngredient()] }));
  };

  const removeIngredient = (index) => {
    if (form.ingredients.length <= 1) return;
    setForm((prev) => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }));
  };

  const handleInstructionChange = (index, value) => {
    setForm((prev) => {
      const updated = [...prev.instructions];
      updated[index] = value;
      return { ...prev, instructions: updated };
    });
    if (errors.instructions) setErrors((prev) => ({ ...prev, instructions: undefined }));
  };

  const addInstruction = () => {
    setForm((prev) => ({ ...prev, instructions: [...prev.instructions, ''] }));
  };

  const removeInstruction = (index) => {
    if (form.instructions.length <= 1) return;
    setForm((prev) => ({ ...prev, instructions: prev.instructions.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const cleanedIngredients = form.ingredients.filter((i) => i.name.trim()).map((i) => ({
      name: i.name.trim(),
      amount: parseFloat(i.amount) || 0,
      unit: i.unit.trim(),
    }));
    const cleanedInstructions = form.instructions.filter((i) => i.trim());
    onSubmit({ ...form, ingredients: cleanedIngredients, instructions: cleanedInstructions });
  };

  const containerStyle = {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  };

  const fieldStyle = {
    marginBottom: '20px',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: `1px solid ${hasError ? '#EF4444' : '#D1D5DB'}`,
    fontSize: '14px',
    color: '#1F2937',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
  });

  const selectStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    color: '#1F2937',
    outline: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer',
  };

  const errorTextStyle = {
    color: '#EF4444',
    fontSize: '12px',
    marginTop: '4px',
  };

  const sectionTitleStyle = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2D6A4F',
    marginBottom: '16px',
    paddingTop: '8px',
    borderTop: '1px solid #E5E7EB',
    marginTop: '8px',
  };

  const addBtnStyle = {
    backgroundColor: 'transparent',
    border: '1px dashed #2D6A4F',
    color: '#2D6A4F',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  };

  const removeBtnStyle = {
    backgroundColor: 'transparent',
    border: '1px solid #FCA5A5',
    color: '#EF4444',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    flexShrink: 0,
  };

  const submitBtnStyle = {
    backgroundColor: '#2D6A4F',
    color: '#FEFAE0',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    marginRight: '12px',
  };

  const cancelBtnStyle = {
    backgroundColor: 'transparent',
    color: '#6B7280',
    border: '1px solid #D1D5DB',
    padding: '14px 28px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const dietaryChipStyle = (active) => ({
    padding: '5px 12px',
    borderRadius: '16px',
    border: active ? '2px solid #2D6A4F' : '1px solid #D1D5DB',
    backgroundColor: active ? '#D1FAE5' : '#fff',
    color: active ? '#065F46' : '#6B7280',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    userSelect: 'none',
  });

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  };

  const threeColStyle = {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr auto',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '8px',
  };

  return (
    <form onSubmit={handleSubmit} style={containerStyle}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Recipe Title *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => handleChange('title', e.target.value)}
          style={inputStyle(!!errors.title)}
          placeholder="e.g. Classic Spaghetti Carbonara"
        />
        {errors.title && <p style={errorTextStyle}>{errors.title}</p>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          style={{ ...inputStyle(false), minHeight: '80px', resize: 'vertical' }}
          placeholder="Describe this recipe..."
        />
      </div>

      <div style={{ ...rowStyle, marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>Cuisine</label>
          <select value={form.cuisine} onChange={(e) => handleChange('cuisine', e.target.value)} style={selectStyle}>
            {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Difficulty</label>
          <select value={form.difficulty} onChange={(e) => handleChange('difficulty', e.target.value)} style={selectStyle}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Dietary Tags</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {DIETARY_OPTIONS.map((option) => (
            <span
              key={option}
              style={dietaryChipStyle(form.dietary.includes(option))}
              onClick={() => handleDietaryToggle(option)}
            >
              {option}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>Prep Time (min)</label>
          <input type="number" min="0" value={form.prepTime} onChange={(e) => handleChange('prepTime', parseInt(e.target.value) || 0)} style={inputStyle(false)} />
        </div>
        <div>
          <label style={labelStyle}>Cook Time (min)</label>
          <input type="number" min="0" value={form.cookTime} onChange={(e) => handleChange('cookTime', parseInt(e.target.value) || 0)} style={inputStyle(false)} />
        </div>
        <div>
          <label style={labelStyle}>Servings</label>
          <input type="number" min="1" value={form.servings} onChange={(e) => handleChange('servings', parseInt(e.target.value) || 1)} style={inputStyle(false)} />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Image URL</label>
        <input
          type="text"
          value={form.imageUrl}
          onChange={(e) => handleChange('imageUrl', e.target.value)}
          style={inputStyle(false)}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Public Recipe</label>
        <div
          onClick={() => handleChange('isPublic', !form.isPublic)}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            backgroundColor: form.isPublic ? '#2D6A4F' : '#D1D5DB',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            position: 'absolute',
            top: '2px',
            left: form.isPublic ? '22px' : '2px',
            transition: 'left 0.2s',
          }} />
        </div>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>{form.isPublic ? 'Visible to everyone' : 'Only visible to you'}</span>
      </div>

      <h3 style={sectionTitleStyle}>Ingredients *</h3>
      {errors.ingredients && <p style={errorTextStyle}>{errors.ingredients}</p>}
      {form.ingredients.map((ing, index) => (
        <div key={index} style={threeColStyle}>
          <input
            type="text"
            placeholder="Ingredient name"
            value={ing.name}
            onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
            style={inputStyle(false)}
          />
          <input
            type="number"
            placeholder="Amount"
            value={ing.amount}
            onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
            style={inputStyle(false)}
          />
          <input
            type="text"
            placeholder="Unit"
            value={ing.unit}
            onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
            style={inputStyle(false)}
          />
          <button type="button" style={removeBtnStyle} onClick={() => removeIngredient(index)}>✕</button>
        </div>
      ))}
      <button type="button" style={addBtnStyle} onClick={addIngredient}>+ Add Ingredient</button>

      <h3 style={sectionTitleStyle}>Instructions *</h3>
      {errors.instructions && <p style={errorTextStyle}>{errors.instructions}</p>}
      {form.instructions.map((step, index) => (
        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{
            minWidth: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#2D6A4F',
            color: '#FEFAE0',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '8px',
          }}>
            {index + 1}
          </div>
          <textarea
            placeholder={`Step ${index + 1}...`}
            value={step}
            onChange={(e) => handleInstructionChange(index, e.target.value)}
            style={{ ...inputStyle(false), flex: 1, minHeight: '60px', resize: 'vertical' }}
          />
          <button type="button" style={{ ...removeBtnStyle, marginTop: '8px' }} onClick={() => removeInstruction(index)}>✕</button>
        </div>
      ))}
      <button type="button" style={addBtnStyle} onClick={addInstruction}>+ Add Step</button>

      <h3 style={sectionTitleStyle}>Nutrition (per serving)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Calories (kcal)', field: 'calories' },
          { label: 'Protein (g)', field: 'protein' },
          { label: 'Carbs (g)', field: 'carbs' },
          { label: 'Fat (g)', field: 'fat' },
        ].map(({ label, field }) => (
          <div key={field}>
            <label style={labelStyle}>{label}</label>
            <input
              type="number"
              min="0"
              value={form.nutrition[field]}
              onChange={(e) => handleNutritionChange(field, e.target.value)}
              style={inputStyle(false)}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
        <button type="submit" style={submitBtnStyle} disabled={loading}>
          {loading ? 'Saving...' : initialData ? 'Update Recipe' : 'Create Recipe'}
        </button>
        {onCancel && (
          <button type="button" style={cancelBtnStyle} onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
};

export default RecipeForm;
