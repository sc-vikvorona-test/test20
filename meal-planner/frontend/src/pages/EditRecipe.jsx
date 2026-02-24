import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import { getRecipe, updateRecipe } from '../services/api.js';
import RecipeForm from '../components/RecipeForm.jsx';

const EditRecipe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useStore();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/recipes');
      return;
    }
    const fetchRecipe = async () => {
      try {
        const res = await getRecipe(id);
        const data = res.data;
        if (data.author?._id !== user?._id && data.author !== user?._id) {
          navigate(`/recipes/${id}`);
          return;
        }
        setRecipe(data);
      } catch {
        setError('Recipe not found');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchRecipe();
  }, [id, token]);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await updateRecipe(id, data);
      navigate(`/recipes/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update recipe');
      setLoading(false);
    }
  };

  const containerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 24px',
  };

  const backBtnStyle = {
    backgroundColor: 'transparent',
    border: '1px solid #D1D5DB',
    color: '#6B7280',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '20px',
    fontSize: '14px',
  };

  if (fetchLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px', fontSize: '48px' }}>⏳</div>
    );
  }

  if (error && !recipe) {
    return (
      <div style={{ ...containerStyle, textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>😕</div>
        <h2 style={{ color: '#1F2937', marginBottom: '16px' }}>{error}</h2>
        <button style={{ ...backBtnStyle, color: '#2D6A4F', borderColor: '#2D6A4F' }} onClick={() => navigate('/recipes')}>Back to Recipes</button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <button style={backBtnStyle} onClick={() => navigate(`/recipes/${id}`)}>← Back to Recipe</button>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#2D6A4F', marginBottom: '8px' }}>Edit Recipe</h1>
        <p style={{ color: '#6B7280', fontSize: '16px' }}>Update "{recipe?.title}"</p>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '24px',
          color: '#DC2626',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {recipe && (
        <RecipeForm
          initialData={recipe}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/recipes/${id}`)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default EditRecipe;
