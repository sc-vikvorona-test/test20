import { useNavigate } from 'react-router-dom';

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

const RecipeCard = ({ recipe }) => {
  const navigate = useNavigate();

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #F3F4F6',
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
    padding: '18px',
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
    marginBottom: '10px',
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '12px',
    lineHeight: '1.3',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const metaStyle = {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    alignItems: 'center',
  };

  const metaItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#6B7280',
  };

  const caloriesStyle = {
    marginLeft: 'auto',
    fontSize: '13px',
    fontWeight: '700',
    color: '#F4A261',
    backgroundColor: '#FEF3E2',
    padding: '3px 8px',
    borderRadius: '8px',
  };

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <div
      style={cardStyle}
      onClick={() => navigate(`/recipes/${recipe._id}`)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
      }}
    >
      <div style={imageContainerStyle}>
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} style={imgStyle} />
        ) : (
          <div style={gradientStyle}>🍽</div>
        )}
      </div>
      <div style={bodyStyle}>
        <span style={cuisineTagStyle}>{recipe.cuisine || 'Other'}</span>
        <h3 style={titleStyle}>{recipe.title}</h3>
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
              <span>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</span>
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