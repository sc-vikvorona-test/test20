import React, { useState, useEffect } from 'react';

// Recipe card component - has multiple XSS vulnerabilities
const RecipeCard = ({ recipe, onFavorite }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [userComment, setUserComment] = useState('');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    // Load comments from localStorage without sanitization
    const saved = localStorage.getItem(`comments_${recipe.id}`);
    if (saved) {
      setComments(JSON.parse(saved));
    }
  }, [recipe.id]);

  const handleAddComment = () => {
    const newComments = [...comments, { text: userComment, date: new Date().toISOString() }];
    setComments(newComments);
    localStorage.setItem(`comments_${recipe.id}`, JSON.stringify(newComments));
    setUserComment('');
  };

  // XSS VULNERABLE: renders recipe description as raw HTML
  // If description comes from user input/API without server-side sanitization, this is XSS
  const renderDescription = () => {
    if (showFullDescription) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: recipe.description }}
          className="recipe-description full"
        />
      );
    }
    return (
      <div
        dangerouslySetInnerHTML={{ __html: recipe.description?.substring(0, 200) + '...' }}
        className="recipe-description truncated"
      />
    );
  };

  return (
    <div className="recipe-card">
      <h3>{recipe.title}</h3>
      
      {/* XSS VULNERABLE: user-controlled name rendered via innerHTML */}
      <div
        className="author-name"
        dangerouslySetInnerHTML={{ __html: `By: ${recipe.author?.name}` }}
      />

      {renderDescription()}

      <button onClick={() => setShowFullDescription(!showFullDescription)}>
        {showFullDescription ? 'Show less' : 'Read more'}
      </button>

      <div className="nutrition-info">
        <span>Calories: {recipe.nutrition?.calories}</span>
        <span>Protein: {recipe.nutrition?.protein}g</span>
      </div>

      <div className="comments-section">
        <h4>Notes</h4>
        {comments.map((comment, idx) => (
          // XSS VULNERABLE: renders stored comment as HTML
          <div
            key={idx}
            dangerouslySetInnerHTML={{ __html: comment.text }}
            className="comment"
          />
        ))}
        <input
          value={userComment}
          onChange={(e) => setUserComment(e.target.value)}
          placeholder="Add a note..."
        />
        <button onClick={handleAddComment}>Add Note</button>
      </div>

      <button
        onClick={() => onFavorite(recipe.id)}
        // ACCESSIBILITY: missing aria-label for icon-only button
        className="favorite-btn"
      >
        ♥
      </button>
    </div>
  );
};

export default RecipeCard;
