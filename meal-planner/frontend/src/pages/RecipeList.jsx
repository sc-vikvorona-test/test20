import { useState, useEffect, useCallback } from 'react';
import { getRecipes } from '../services/api.js';
import RecipeCard from '../components/RecipeCard.jsx';
import SearchBar from '../components/SearchBar.jsx';

const CUISINES = ['All', 'Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian', 'French', 'Thai', 'Japanese', 'Greek', 'Middle Eastern', 'Other'];

const RecipeList = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 12 };
      if (search) params.q = search;
      if (cuisine !== 'All') params.cuisine = cuisine;
      const res = await getRecipes(params);
      setRecipes(res.data.recipes);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch {
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [search, cuisine, page]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 24px',
  };

  const headerStyle = {
    marginBottom: '32px',
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2D6A4F',
    marginBottom: '8px',
  };

  const subtitleStyle = {
    color: '#6B7280',
    fontSize: '16px',
    marginBottom: '24px',
  };

  const filtersStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '20px',
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

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
    marginTop: '32px',
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

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Explore Recipes</h1>
        <p style={subtitleStyle}>{total > 0 ? `${total} recipes found` : 'Search for delicious recipes'}</p>
        <SearchBar
          value={search}
          onChange={(val) => { setSearch(val); setPage(1); }}
          placeholder="Search recipes by name, ingredient, or tag..."
        />
        <div style={filtersStyle}>
          {CUISINES.map((c) => (
            <button key={c} style={chipStyle(cuisine === c)} onClick={() => { setCuisine(c); setPage(1); }}>{c}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <div style={{ fontSize: '48px' }}>⏳</div>
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
          <p style={{ fontSize: '15px' }}>Try a different search term or cuisine filter</p>
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <div style={gridStyle}>
          {recipes.map((recipe) => (
            <RecipeCard key={recipe._id} recipe={recipe} />
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