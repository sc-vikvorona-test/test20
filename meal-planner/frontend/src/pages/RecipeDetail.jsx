import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecipe, rateRecipe, toggleFavorite, duplicateRecipe } from '../services/api.js';
import IngredientList from '../components/IngredientList.jsx';
import NutritionBar from '../components/NutritionBar.jsx';
import RatingStars from '../components/RatingStars.jsx';
import { useStore } from '../store/index.js';

const CUISINE_GRADIENTS = {
  Italian: 'linear-gradient(135deg, #22C55E, #16A34A)',
  Mexican: 'linear-gradient(135deg, #EF4444, #F97316)',
  Asian: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
  American: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
  Mediterranean: 'linear-gradient(135deg, #06B6D4, #0284C7)',
  Indian: 'linear-gradient(135deg, #F59E0B, #D97706)',
  French: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  Thai: 'linear-gradient(135deg, #10B981, #059669)',
  Japanese: 'linear-gradient(135deg, #F43F5E, #E11D48)',
  Greek: 'linear-gradient(135deg, #0EA5E9, #0369A1)',
  'Middle Eastern': 'linear-gradient(135deg, #F59E0B, #92400E)',
  Other: 'linear-gradient(135deg, #2D6A4F, #52B788, #F4A261)',
};

const DIFFICULTY_COLORS = {
  Easy: { bg: '#D1FAE5', text: '#065F46' },
  Medium: { bg: '#FEF3C7', text: '#92400E' },
  Hard: { bg: '#FEE2E2', text: '#991B1B' },
};

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, favorites, toggleFavoriteLocal } = useStore();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [userRating, setUserRating] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const isFavorited = recipe ? favorites.includes(recipe._id) : false;

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const res = await getRecipe(id);
        setRecipe(res.data);
        if (user && res.data.ratings) {
          const myRating = res.data.ratings.find((r) => r.user === user.id || r.user?._id === user.id);
          if (myRating) setUserRating(myRating.value);
        }
      } catch {
        setError('Recipe not found');
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id, user]);

  const handleRate = async (value) => {
    if (!token || ratingLoading) return;
    setRatingLoading(true);
    try {
      const res = await rateRecipe(id, value);
      setUserRating(value);
      setRecipe((prev) => ({
        ...prev,
        averageRating: res.data.averageRating,
        ratingCount: res.data.ratingCount,
      }));
    } catch {
    } finally {
      setRatingLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!token || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      const res = await toggleFavorite(id);
      toggleFavoriteLocal(recipe._id);
      setRecipe((prev) => ({ ...prev, favoriteCount: res.data.favoriteCount }));
    } catch {
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!token || duplicating) return;
    setDuplicating(true);
    try {
      const res = await duplicateRecipe(id);
      navigate(`/recipes/${res.data._id}`);
    } catch {
    } finally {
      setDuplicating(false);
    }
  };

  const containerStyle = {
    maxWidth: '900px',
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
    marginBottom: '24px',
    fontSize: '14px',
  };

  const imageStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '16px',
    objectFit: 'cover',
    marginBottom: '32px',
  };

  const gradientImageStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '16px',
    marginBottom: '32px',
    background: CUISINE_GRADIENTS[recipe?.cuisine] || CUISINE_GRADIENTS.Other,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '80px',
  };

  const titleStyle = {
    fontSize: '40px',
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: '12px',
    lineHeight: '1.2',
  };

  const metaRowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
  };

  const metaItemStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '80px',
  };

  const metaLabelStyle = {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  };

  const metaValueStyle = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2D6A4F',
  };

  const cuisineTagStyle = {
    display: 'inline-block',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  };

  const descriptionStyle = {
    fontSize: '17px',
    color: '#4B5563',
    lineHeight: '1.7',
    marginBottom: '32px',
  };

  const sectionTitleStyle = {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #E5E7EB',
  };

  const instructionsListStyle = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  };

  const instructionItemStyle = {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '10px',
  };

  const stepNumberStyle = {
    minWidth: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#2D6A4F',
    color: '#FEFAE0',
    fontSize: '14px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const actionBarStyle = {
    display: 'flex',
    gap: '12px',
    marginBottom: '28px',
    flexWrap: 'wrap',
    alignItems: 'center',
  };

  const favBtnStyle = {
    backgroundColor: isFavorited ? '#FEE2E2' : '#F9FAFB',
    color: isFavorited ? '#DC2626' : '#6B7280',
    border: `1px solid ${isFavorited ? '#FECACA' : '#E5E7EB'}`,
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: favoriteLoading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  };

  const editBtnStyle = {
    backgroundColor: '#F0FDF4',
    color: '#2D6A4F',
    border: '1px solid #BBF7D0',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const dupBtnStyle = {
    backgroundColor: '#FFF7ED',
    color: '#C2410C',
    border: '1px solid #FED7AA',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: duplicating ? 'not-allowed' : 'pointer',
    opacity: duplicating ? 0.7 : 1,
  };

  const addToPlannerStyle = {
    backgroundColor: '#F4A261',
    color: '#fff',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(244,162,97,0.35)',
    marginTop: '16px',
    width: '100%',
    transition: 'background-color 0.3s',
  };

  const servingsControlStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  };

  const servingsBtnStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid #D1D5DB',
    backgroundColor: '#fff',
    color: '#374151',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
  };

  const dietaryTagStyle = {
    display: 'inline-block',
    backgroundColor: '#EEF2FF',
    color: '#4338CA',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  };

  const isAuthor = user && recipe && (recipe.author?._id === user.id || recipe.author === user.id);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px', fontSize: '48px' }}>⏳</div>
    );
  }

  if (error || !recipe) {
    return (
      <div style={{ ...containerStyle, textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>😕</div>
        <h2 style={{ color: '#1F2937', marginBottom: '16px' }}>{error || 'Recipe not found'}</h2>
        <button style={{ ...backBtnStyle, color: '#2D6A4F', borderColor: '#2D6A4F' }} onClick={() => navigate('/recipes')}>Back to Recipes</button>
      </div>
    );
  }

  const adjustedIngredients = recipe.ingredients.map((ing) => ({
    ...ing,
    amount: Math.round(ing.amount * servingsMultiplier * 10) / 10,
  }));

  return (
    <div style={containerStyle}>
      <button style={backBtnStyle} onClick={() => navigate('/recipes')}>← Back to Recipes</button>

      {recipe.imageUrl ? (
        <img src={recipe.imageUrl} alt={recipe.title} style={imageStyle} />
      ) : (
        <div style={gradientImageStyle}>🍽</div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <span style={cuisineTagStyle}>{recipe.cuisine}</span>
        {recipe.difficulty && (
          <span style={{
            ...cuisineTagStyle,
            backgroundColor: DIFFICULTY_COLORS[recipe.difficulty]?.bg || '#F3F4F6',
            color: DIFFICULTY_COLORS[recipe.difficulty]?.text || '#374151',
          }}>
            {recipe.difficulty}
          </span>
        )}
        {recipe.tags?.map((tag) => (
          <span key={tag} style={{ ...cuisineTagStyle, backgroundColor: '#FEF3C7', color: '#92400E' }}>{tag}</span>
        ))}
      </div>

      {recipe.dietary?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {recipe.dietary.map((d) => (
            <span key={d} style={dietaryTagStyle}>{d}</span>
          ))}
        </div>
      )}

      <h1 style={titleStyle}>{recipe.title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <RatingStars value={recipe.averageRating || 0} size={20} showCount count={recipe.ratingCount || 0} />
        {recipe.favoriteCount > 0 && (
          <span style={{ fontSize: '14px', color: '#6B7280' }}>❤️ {recipe.favoriteCount} favorites</span>
        )}
      </div>

      {recipe.author?.name && (
        <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>By {recipe.author.name}</p>
      )}

      {token && (
        <div style={actionBarStyle}>
          {isAuthor && (
            <button style={editBtnStyle} onClick={() => navigate(`/recipes/${id}/edit`)}>✏️ Edit Recipe</button>
          )}
          {token && (
            <button style={dupBtnStyle} onClick={handleDuplicate} disabled={duplicating}>
              {duplicating ? 'Duplicating...' : '📋 Duplicate'}
            </button>
          )}
          <button style={favBtnStyle} onClick={handleFavorite} disabled={favoriteLoading}>
            {isFavorited ? '❤️ Favorited' : '🤍 Favorite'}
          </button>
        </div>
      )}

      {recipe.description && <p style={descriptionStyle}>{recipe.description}</p>}

      <div style={metaRowStyle}>
        <div style={metaItemStyle}>
          <span style={metaLabelStyle}>Prep Time</span>
          <span style={metaValueStyle}>{recipe.prepTime}m</span>
        </div>
        <div style={metaItemStyle}>
          <span style={metaLabelStyle}>Cook Time</span>
          <span style={metaValueStyle}>{recipe.cookTime}m</span>
        </div>
        <div style={metaItemStyle}>
          <span style={metaLabelStyle}>Total Time</span>
          <span style={metaValueStyle}>{recipe.prepTime + recipe.cookTime}m</span>
        </div>
        <div style={metaItemStyle}>
          <span style={metaLabelStyle}>Servings</span>
          <span style={metaValueStyle}>{recipe.servings * servingsMultiplier}</span>
        </div>
        {recipe.nutrition?.calories > 0 && (
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Calories</span>
            <span style={metaValueStyle}>{recipe.nutrition.calories}</span>
          </div>
        )}
      </div>

      {token && (
        <div style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>Rate this recipe:</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RatingStars value={userRating} onChange={handleRate} size={24} />
            {userRating > 0 && (
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Your rating: {userRating}/5</span>
            )}
            {ratingLoading && <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Saving...</span>}
          </div>
        </div>
      )}

      {recipe.nutrition && (recipe.nutrition.calories > 0 || recipe.nutrition.protein > 0) && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={sectionTitleStyle}>Nutrition</h2>
          <NutritionBar nutrition={recipe.nutrition} />
        </div>
      )}

      {recipe.ingredients?.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: 0, borderBottom: 'none' }}>Ingredients</h2>
            <div style={servingsControlStyle}>
              <span style={{ fontSize: '14px', color: '#6B7280' }}>Servings:</span>
              <button style={servingsBtnStyle} onClick={() => setServingsMultiplier((m) => Math.max(0.5, m - 0.5))}>−</button>
              <span style={{ fontWeight: '600', color: '#2D6A4F', minWidth: '30px', textAlign: 'center' }}>{recipe.servings * servingsMultiplier}</span>
              <button style={servingsBtnStyle} onClick={() => setServingsMultiplier((m) => m + 0.5)}>+</button>
            </div>
          </div>
          <div style={{ borderBottom: '2px solid #E5E7EB', marginBottom: '16px' }} />
          <IngredientList ingredients={adjustedIngredients} />
        </div>
      )}

      {recipe.instructions?.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={sectionTitleStyle}>Instructions</h2>
          <ol style={instructionsListStyle}>
            {recipe.instructions.map((step, index) => (
              <li key={index} style={instructionItemStyle}>
                <div style={stepNumberStyle}>{index + 1}</div>
                <p style={{ margin: 0, fontSize: '16px', color: '#374151', lineHeight: '1.6' }}>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {token && (
        <button
          style={addToPlannerStyle}
          onClick={() => navigate('/planner')}
        >
          + Add to Meal Planner
        </button>
      )}
    </div>
  );
};

export default RecipeDetail;
