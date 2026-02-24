import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useStore } from '../store/index.js';
import { toggleFavorite } from '../services/api.js';
import RatingStars from './RatingStars.jsx';

const CUISINE_COLORS = {
  Italian: '#FDE68A',
  Mexican: '#FCA5A5',
  Asian: '#A7F3D0',
  American: '#BFDBFE',
  Mediterranean: '#DDD6FE',
  Indian: '#FED7AA',
  French: '#FBCFE8',
  Thai: '#6EE7B7',
  Japanese: '#BAE6FD',
  Greek: '#A5F3FC',
  'Middle Eastern': '#FDE68A',
  Other: '#E5E7EB',
};

const DIFFICULTY_BADGE = {
  Easy: { bg: '#D1FAE5', color: '#065F46' },
  Medium: { bg: '#FEF3C7', color: '#92400E' },
  Hard: { bg: '#FEE2E2', color: '#991B1B' },
};

const RecipeCard = ({ recipe }) => {
  const navigate = useNavigate();
  const { token, favorites, toggleFavoriteLocal } = useStore();
  const [favLoading, setFavLoading] = useState(false);

  const isFavorited = favorites.includes(recipe._id);
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  const handleFavorite = async (e) => {
    e.stopPropagation();
    if (!token || favLoading) return;
    setFavLoading(true);
    try {
      await toggleFavorite(recipe._id);
      toggleFavoriteLocal(recipe._id);
    } catch {
    } finally {
      setFavLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #F3F4F6',
    position: 'relative',
  };

  const imageContainerStyle = {
    height: '200px',
    overflow: 'hidden',
    position: 'relative',
  };

  const gradientStyle = {
    height: '200px',
    background: 'linear-gradient(135deg, #2D6A4F, #40916C, #52B788)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '56px',
  };

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const bodyStyle = {
    padding: '16px',
  };

  const tagRowStyle = {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  };

  const cuisineTagStyle = {
    display: 'inline-block',
    backgroundColor: CUISINE_COLORS[recipe.cuisine] || '#E5E7EB',
    color: '#374151',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const difficultyBadgeStyle = recipe.difficulty ? {
    display: 'inline-block',
    backgroundColor: DIFFICULTY_BADGE[recipe.difficulty]?.bg || '#F3F4F6',
    color: DIFFICULTY_BADGE[recipe.difficulty]?.color || '#374151',
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
  } : null;

  const titleStyle = {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '8px',
    lineHeight: '1.3',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const metaStyle = {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: '8px',
  };

  const metaItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#6B7280',
  };

  const caloriesStyle = {
    marginLeft: 'auto',
    fontSize: '12px',
    fontWeight: '700',
    color: '#F4A261',
    backgroundColor: '#FEF3E2',
    padding: '3px 8px',
    borderRadius: '8px',
  };

  const favBtnStyle = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    border: 'none',
    cursor: token ? 'pointer' : 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
    transition: 'transform 0.15s',
  };

  return (
    <div
      style={cardStyle}
      onClick={() => navigate(`/recipes/${recipe._id}`)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px) scale(1.01)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.14)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
      }}
    >
      <div style={imageContainerStyle}>
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} style={imgStyle} />
        ) : (
          <div style={gradientStyle}>🍽</div>
        )}
        {token && (
          <button
            style={favBtnStyle}
            onClick={handleFavorite}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isFavorited ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      <div style={bodyStyle}>
        <div style={tagRowStyle}>
          <span style={cuisineTagStyle}>{recipe.cuisine || 'Other'}</span>
          {recipe.difficulty && difficultyBadgeStyle && (
            <span style={difficultyBadgeStyle}>{recipe.difficulty}</span>
          )}
          {recipe.dietary?.slice(0, 2).map((d) => (
            <span key={d} style={{ display: 'inline-block', backgroundColor: '#EEF2FF', color: '#4338CA', padding: '2px 7px', borderRadius: '8px', fontSize: '10px', fontWeight: '500' }}>
              {d}
            </span>
          ))}
        </div>
        <h3 style={titleStyle}>{recipe.title}</h3>
        {(recipe.averageRating > 0 || recipe.ratingCount > 0) && (
          <div style={{ marginBottom: '8px' }}>
            <RatingStars value={recipe.averageRating || 0} size={13} showCount count={recipe.ratingCount || 0} />
          </div>
        )}
        <div style={metaStyle}>
          {totalTime > 0 && (
            <span style={metaItemStyle}>
              <span>⏱</span>
              <span>{totalTime} min</span>
            </span>
          )}
          {recipe.servings > 0 && (
            <span style={metaItemStyle}>
              <span>👤</span>
              <span>{recipe.servings}</span>
            </span>
          )}
          {recipe.nutrition?.calories > 0 && (
            <span style={caloriesStyle}>{recipe.nutrition.calories} kcal</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
