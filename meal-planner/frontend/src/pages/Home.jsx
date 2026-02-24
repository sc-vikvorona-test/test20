import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getRecipes } from '../services/api.js';
import RecipeCard from '../components/RecipeCard.jsx';

const Home = () => {
  const navigate = useNavigate();
  const [featuredRecipes, setFeaturedRecipes] = useState([]);

  useEffect(() => {
    getRecipes({ limit: 3 })
      .then((res) => setFeaturedRecipes(res.data.recipes))
      .catch(() => {});
  }, []);

  const heroStyle = {
    background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 50%, #52B788 100%)',
    minHeight: '500px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  };

  const heroTitleStyle = {
    fontSize: '56px',
    fontWeight: '800',
    color: '#FEFAE0',
    margin: '0 0 20px 0',
    lineHeight: '1.1',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const heroSubStyle = {
    fontSize: '20px',
    color: 'rgba(254,250,224,0.9)',
    maxWidth: '560px',
    margin: '0 0 40px 0',
    lineHeight: '1.6',
  };

  const ctaBtnStyle = {
    backgroundColor: '#F4A261',
    color: '#fff',
    border: 'none',
    padding: '16px 36px',
    borderRadius: '50px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(244,162,97,0.4)',
    transition: 'transform 0.2s',
  };

  const sectionStyle = {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '64px 24px',
  };

  const sectionTitleStyle = {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2D6A4F',
    marginBottom: '8px',
  };

  const sectionSubStyle = {
    fontSize: '16px',
    color: '#6B7280',
    marginBottom: '40px',
  };

  const recipesGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  };

  const stepsContainerStyle = {
    background: 'linear-gradient(135deg, #f0faf5 0%, #e8f5e9 100%)',
    padding: '64px 24px',
  };

  const stepsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '32px',
    maxWidth: '1100px',
    margin: '0 auto',
  };

  const stepCardStyle = {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    textAlign: 'center',
  };

  const stepNumberStyle = {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#2D6A4F',
    color: '#FEFAE0',
    fontSize: '24px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px auto',
  };

  const steps = [
    { number: '1', icon: '🔍', title: 'Browse Recipes', desc: 'Explore hundreds of delicious recipes from various cuisines. Filter by ingredients, prep time, or dietary needs.' },
    { number: '2', icon: '📅', title: 'Plan Your Week', desc: 'Drag and drop recipes into your weekly meal calendar. Plan breakfast, lunch, and dinner for every day.' },
    { number: '3', icon: '🛒', title: 'Shop Smarter', desc: 'Automatically generate a grouped shopping list from your meal plan. Never forget an ingredient again.' },
  ];

  const ctaSectionStyle = {
    backgroundColor: '#2D6A4F',
    padding: '80px 24px',
    textAlign: 'center',
  };

  return (
    <div>
      <section style={heroStyle}>
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <h1 style={heroTitleStyle}>Plan Meals.<br />Eat Better.</h1>
        <p style={heroSubStyle}>Discover delicious recipes, plan your weekly meals, and generate smart shopping lists — all in one place.</p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button style={ctaBtnStyle} onClick={() => navigate('/recipes')}>Explore Recipes</button>
          <button style={{ ...ctaBtnStyle, backgroundColor: 'transparent', border: '2px solid rgba(254,250,224,0.6)', color: '#FEFAE0', boxShadow: 'none' }} onClick={() => navigate('/planner')}>Start Planning</button>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Featured Recipes</h2>
        <p style={sectionSubStyle}>Handpicked recipes to inspire your next meal</p>
        {featuredRecipes.length > 0 ? (
          <div style={recipesGridStyle}>
            {featuredRecipes.map((recipe) => (
              <RecipeCard key={recipe._id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🍳</div>
            <p style={{ fontSize: '18px' }}>No recipes yet. Be the first to add one!</p>
            <button style={{ ...ctaBtnStyle, marginTop: '20px', fontSize: '16px', padding: '12px 28px' }} onClick={() => navigate('/recipes')}>Browse Recipes</button>
          </div>
        )}
        {featuredRecipes.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button style={{ ...ctaBtnStyle, backgroundColor: '#2D6A4F', fontSize: '16px', padding: '12px 28px' }} onClick={() => navigate('/recipes')}>View All Recipes</button>
          </div>
        )}
      </section>

      <section style={stepsContainerStyle}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ ...sectionTitleStyle, textAlign: 'center', marginBottom: '8px' }}>How It Works</h2>
          <p style={{ ...sectionSubStyle, textAlign: 'center', marginBottom: '48px' }}>Three simple steps to better eating</p>
          <div style={stepsGridStyle}>
            {steps.map((step) => (
              <div key={step.number} style={stepCardStyle}>
                <div style={stepNumberStyle}>{step.number}</div>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>{step.icon}</div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', marginBottom: '12px' }}>{step.title}</h3>
                <p style={{ fontSize: '15px', color: '#6B7280', lineHeight: '1.6' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={ctaSectionStyle}>
        <h2 style={{ fontSize: '36px', fontWeight: '800', color: '#FEFAE0', marginBottom: '16px' }}>Ready to Start Planning?</h2>
        <p style={{ fontSize: '18px', color: 'rgba(254,250,224,0.8)', marginBottom: '36px', maxWidth: '500px', margin: '0 auto 36px auto' }}>Join thousands of home cooks who plan smarter and eat healthier.</p>
        <button style={ctaBtnStyle} onClick={() => navigate('/recipes')}>Get Started Free</button>
      </section>
    </div>
  );
};

export default Home;