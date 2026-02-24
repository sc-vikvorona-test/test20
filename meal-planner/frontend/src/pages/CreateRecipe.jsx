import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useStore } from '../store/index.js';
import { createRecipe } from '../services/api.js';
import RecipeForm from '../components/RecipeForm.jsx';

const CreateRecipe = () => {
  const navigate = useNavigate();
  const { token } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createRecipe(data);
      navigate(`/recipes/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create recipe');
      setLoading(false);
    }
  };

  const containerStyle = {
    maxWidth: '800px',
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

  if (!token) {
    return (
      <div style={{ ...containerStyle, textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ color: '#1F2937', marginBottom: '12px', fontSize: '24px' }}>Sign in to create recipes</h2>
        <p style={{ color: '#6B7280', marginBottom: '24px' }}>You need to be logged in to add new recipes to the collection.</p>
        <button
          style={{
            backgroundColor: '#2D6A4F',
            color: '#FEFAE0',
            border: 'none',
            padding: '12px 28px',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/recipes')}
        >
          Browse Recipes
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button
          onClick={() => navigate('/recipes')}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #D1D5DB',
            color: '#6B7280',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          ← Back to Recipes
        </button>
        <h1 style={titleStyle}>Create New Recipe</h1>
        <p style={{ color: '#6B7280', fontSize: '16px' }}>Share your culinary creation with the community</p>
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

      <RecipeForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/recipes')}
        loading={loading}
      />
    </div>
  );
};

export default CreateRecipe;
