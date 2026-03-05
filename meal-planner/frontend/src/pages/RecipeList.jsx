import { useState, useEffect, useCallback } from 'react';
import { getRecipes } from '../services/api.js';
import RecipeCard from '../components/RecipeCard.jsx';
import SearchBar from '../components/SearchBar.jsx';

const CUISINES = ['All', 'Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian', 'French', 'Thai', 'Japanese', 'Greek', 'Middle Eastern', 'Other'];
const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];
const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 'keto', 'paleo'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'quick', label: 'Quickest' },
];

const SkeletonCard = () => (
  <div style={{
    backgroundColor: '#fff',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  }}>
    <div style={{ height: '200px', backgroundColor: '#F3F4F6', animation: 'pulse 1.5s infinite' }} />
    <div style={{ padding: '18px' }}>
      <div style={{ height: '14px', backgroundColor: '#F3F4F6', borderRadius: '6px', width: '40%', marginBottom: '12px' }} />
      <div style={{ height: '20px', backgroundColor: '#F3F4F6', borderRadius: '6px', width: '85%', marginBottom: '8px' }} />
      <div style={{ height: '16px', backgroundColor: '#F3F4F6', borderRadius: '6px', width: '60%' }} />
    </div>
  </div>
);

const RecipeList = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [sort, setSort] = useState('newest');
  const [selectedDietary, setSelectedDietary] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState('grid');

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 12, sort };
      if (search) params.q = search;
      if (cuisine !== 'All') params.cuisine = cuisine;
      if (difficulty !== 'All') params.difficulty = difficulty;
      if (selectedDietary.length > 0) params.dietary = selectedDietary.join(',');
      const res = await getRecipes(params);
      setRecipes(res.data.recipes);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch {
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [search, cuisine, difficulty, sort, selectedDietary, page]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const toggleDietary = (option) => {
    setSelectedDietary((prev) =>
      prev.includes(option) ? prev.filter((d) => d !== option) : [...prev, option]
    );
    setPage(1);
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 24px',
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2D6A4F',
    marginBottom: '8px',
  };

  const filtersRowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '16px',
    alignItems: 'center',
  };

  const chipStyle = (active) => ({
    padding: '6px 16px',
    borderRadius: '20px',
    border: active ? '2px solid #2D6A4F' : '2px solid #E5E7EB',
    backgroundColor: active ? '#2D6A4F' : '#fff',
    color: active ? '#FEFAE0' : '#6B7280',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const dietaryChipStyle = (active) => ({
    padding: '5px 12px',
    borderRadius: '16px',
    border: active ? '2px solid #4338CA' : '1px solid #E5E7EB',
    backgroundColor: active ? '#EEF2FF' : '#fff',
    color: active ? '#4338CA' : '#6B7280',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    cursor: 'pointer',
    outline: 'none',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
    marginTop: '32px',
  };

  const listContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '32px',
  };

  const listItemStyle = {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
    display: 'flex',
    gap: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
    border: '1px solid #F3F4F6',
  };

  const paginationStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    marginTop: '48px',
  };

  const pageButtonStyle = (active) => ({
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: active ? '2px solid #2D6A4F' : '1px solid #E5E7EB',
    backgroundColor: active ? '#2D6A4F' : '#fff',
    color: active ? '#FEFAE0' : '#374151',
    fontWeight: active ? '600' : '400',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const viewToggleBtnStyle = (active) => ({
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    backgroundColor: active ? '#2D6A4F' : '#fff',
    color: active ? '#FEFAE0' : '#6B7280',
    fontSize: '16px',
    cursor: 'pointer',
  });

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={titleStyle}>Explore Recipes</h1>
        <p style={{ color: '#6B7280', fontSize: '16px', marginBottom: '24px' }}>
          {total > 0 ? `${total} recipes found` : 'Search for delicious recipes'}
        </p>
        <SearchBar
          value={search}
          onChange={(val) => { setSearch(val); setPage(1); }}
          placeholder="Search recipes by name, ingredient, or tag..."
        />

        <div style={filtersRowStyle}>
          {CUISINES.map((c) => (
            <button key={c} style={chipStyle(cuisine === c)} onClick={() => { setCuisine(c); setPage(1); }}>{c}</button>
          ))}
        </div>

        <div style={{ ...filtersRowStyle, marginTop: '12px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={difficulty}
              onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
              style={selectStyle}
            >
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d === 'All' ? 'All Difficulties' : d}</option>)}
            </select>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              style={selectStyle}
            >
              {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={viewToggleBtnStyle(viewMode === 'grid')} onClick={() => setViewMode('grid')}>⊞</button>
            <button style={viewToggleBtnStyle(viewMode === 'list')} onClick={() => setViewMode('list')}>☰</button>
          </div>
        </div>

        <div style={{ ...filtersRowStyle, marginTop: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Dietary:</span>
          {DIETARY_OPTIONS.map((option) => (
            <button
              key={option}
              style={dietaryChipStyle(selectedDietary.includes(option))}
              onClick={() => toggleDietary(option)}
            >
              {option}
            </button>
          ))}
          {selectedDietary.length > 0 && (
            <button
              style={{ ...dietaryChipStyle(false), color: '#EF4444', borderColor: '#FCA5A5' }}
              onClick={() => { setSelectedDietary([]); setPage(1); }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={gridStyle}>
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', padding: '16px', color: '#DC2626', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {!loading && !error && recipes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px', color: '#9CA3AF' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🍽</div>
          <p style={{ fontSize: '20px', marginBottom: '8px' }}>No recipes found</p>
          <p style={{ fontSize: '15px' }}>Try a different search term or filter</p>
        </div>
      )}

      {!loading && recipes.length > 0 && viewMode === 'grid' && (
        <div style={gridStyle}>
          {recipes.map((recipe) => (
            <RecipeCard key={recipe._id} recipe={recipe} />
          ))}
        </div>
      )}

      {!loading && recipes.length > 0 && viewMode === 'list' && (
        <div style={listContainerStyle}>
          {recipes.map((recipe) => (
            <div
              key={recipe._id}
              style={listItemStyle}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.07)'}
              onClick={() => {}}
            >
              <div style={{ width: '120px', flexShrink: 0, backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : '🍽'}
              </div>
              <div style={{ padding: '16px', flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                  <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>{recipe.cuisine}</span>
                  {recipe.difficulty && (
                    <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>{recipe.difficulty}</span>
                  )}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', marginBottom: '6px' }}>{recipe.title}</h3>
                {recipe.description && (
                  <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{recipe.description}</p>
                )}
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9CA3AF' }}>
                  {(recipe.prepTime + recipe.cookTime) > 0 && <span>⏱ {recipe.prepTime + recipe.cookTime} min</span>}
                  {recipe.servings > 0 && <span>👤 {recipe.servings} servings</span>}
                  {recipe.nutrition?.calories > 0 && <span>🔥 {recipe.nutrition.calories} kcal</span>}
                  {recipe.averageRating > 0 && <span>⭐ {recipe.averageRating.toFixed(1)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={paginationStyle}>
          <button style={{ ...pageButtonStyle(false), width: 'auto', padding: '0 12px' }} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
            return (
              <button key={pageNum} style={pageButtonStyle(page === pageNum)} onClick={() => setPage(pageNum)}>{pageNum}</button>
            );
          })}
          <button style={{ ...pageButtonStyle(false), width: 'auto', padding: '0 12px' }} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
        </div>
      )}
    </div>
  );
};

export default RecipeList;
