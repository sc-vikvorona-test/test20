import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getRecipes } from '../services/api.js';
import RecipeCard from '../components/RecipeCard.jsx';
import { useStore } from '../store/index.js';

const CUISINES_WITH_EMOJI = [
  { name: 'Italian', emoji: '🍕' },
  { name: 'Mexican', emoji: '🌮' },
  { name: 'Asian', emoji: '🥢' },
  { name: 'American', emoji: '🍔' },
  { name: 'Mediterranean', emoji: '🫒' },
  { name: 'Indian', emoji: '🍛' },
  { name: 'French', emoji: '🥐' },
  { name: 'Thai', emoji: '🍜' },
  { name: 'Japanese', emoji: '🍱' },
  { name: 'Greek', emoji: '🥗' },
  { name: 'Middle Eastern', emoji: '🧆' },
  { name: 'Other', emoji: '🍴' },
];

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: 'Home Cook',
    text: 'MealPlanner transformed how I approach weeknight dinners. I save hours every week and eat so much healthier now!',
    color: '#2D6A4F',
  },
  {
    name: 'James T.',
    role: 'Fitness Enthusiast',
    text: 'The nutrition tracking is incredible. I can hit my macros every day with the weekly planning feature. Game changer!',
    color: '#F4A261',
  },
  {
    name: 'Laura K.',
    role: 'Busy Parent',
    text: "Shopping lists that automatically generate from my meal plan? I'll never forget an ingredient again. My kids love the variety too!",
    color: '#3B82F6',
  },
];

const Home = () => {
  const navigate = useNavigate();
  const { token } = useStore();
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setFeaturedLoading(true);
    getRecipes({ limit: 6, sort: 'popular' })
      .then((res) => setFeaturedRecipes(res.data.recipes))
      .catch(() => {})
      .finally(() => setFeaturedLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recipes?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/recipes');
    }
  };

  const heroStyle = {
    background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 40%, #40916C 70%, #52B788 100%)',
    minHeight: '600px',
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
    fontSize: '68px',
    fontWeight: '900',
    color: '#FEFAE0',
    margin: '0 0 24px 0',
    lineHeight: '1.05',
    textShadow: '0 2px 8px rgba(0,0,0,0.15)',
    letterSpacing: '-2px',
  };

  const heroSubStyle = {
    fontSize: '20px',
    color: 'rgba(254,250,224,0.9)',
    maxWidth: '600px',
    margin: '0 0 40px 0',
    lineHeight: '1.7',
  };

  const searchBarStyle = {
    display: 'flex',
    backgroundColor: '#fff',
    borderRadius: '50px',
    overflow: 'hidden',
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
    marginBottom: '36px',
  };

  const searchInputStyle = {
    flex: 1,
    padding: '16px 24px',
    fontSize: '16px',
    border: 'none',
    outline: 'none',
    color: '#1F2937',
    backgroundColor: 'transparent',
  };

  const searchBtnStyle = {
    backgroundColor: '#F4A261',
    color: '#fff',
    border: 'none',
    padding: '16px 28px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    borderRadius: '0 50px 50px 0',
  };

  const ctaBtnStyle = {
    backgroundColor: '#F4A261',
    color: '#fff',
    border: 'none',
    padding: '16px 36px',
    borderRadius: '50px',
    fontSize: '17px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(244,162,97,0.45)',
    textDecoration: 'none',
    display: 'inline-block',
  };

  const ghostBtnStyle = {
    backgroundColor: 'transparent',
    color: '#FEFAE0',
    border: '2px solid rgba(254,250,224,0.6)',
    padding: '16px 36px',
    borderRadius: '50px',
    fontSize: '17px',
    fontWeight: '700',
    cursor: 'pointer',
  };

  const statsBarStyle = {
    backgroundColor: '#1B4332',
    padding: '32px 24px',
    display: 'flex',
    justifyContent: 'center',
    gap: '60px',
    flexWrap: 'wrap',
  };

  const sectionStyle = {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '72px 24px',
  };

  const sectionTitleStyle = {
    fontSize: '38px',
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  };

  const sectionSubStyle = {
    fontSize: '17px',
    color: '#6B7280',
    marginBottom: '48px',
    lineHeight: '1.6',
  };

  const recipesGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  };

  const cuisineGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '16px',
  };

  const cuisineCardStyle = {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '24px 16px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    border: '1px solid #F3F4F6',
  };

  const stepsContainerStyle = {
    background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    padding: '80px 24px',
  };

  const stepsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '28px',
    maxWidth: '1100px',
    margin: '0 auto',
  };

  const stepCardStyle = {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px 28px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    textAlign: 'center',
  };

  const stepNumberStyle = {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#2D6A4F',
    color: '#FEFAE0',
    fontSize: '22px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px auto',
  };

  const testimonialGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  };

  const testimonialCardStyle = {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    border: '1px solid #F3F4F6',
    position: 'relative',
  };

  const ctaSectionStyle = {
    background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)',
    padding: '100px 24px',
    textAlign: 'center',
  };

  const footerStyle = {
    backgroundColor: '#111827',
    color: '#9CA3AF',
    padding: '48px 24px 24px',
  };

  const steps = [
    { number: '1', icon: '🔍', title: 'Discover Recipes', desc: 'Browse hundreds of community recipes. Filter by cuisine, difficulty, dietary needs, and rating to find your perfect meal.' },
    { number: '2', icon: '📅', title: 'Plan Your Week', desc: 'Add recipes to your weekly meal calendar for breakfast, lunch, dinner, and snacks. Balance nutrition every day.' },
    { number: '3', icon: '🛒', title: 'Smart Shopping', desc: 'Auto-generate a categorized shopping list from your meal plan. Add custom items and export or print your list.' },
    { number: '4', icon: '📊', title: 'Track Nutrition', desc: 'Monitor daily and weekly macros. See your calorie, protein, carb, and fat intake against your personal targets.' },
  ];

  const skeletonRecipeCards = Array.from({ length: 6 }).map((_, i) => (
    <div key={i} style={{ backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ height: '200px', backgroundColor: '#F3F4F6' }} />
      <div style={{ padding: '16px' }}>
        <div style={{ height: '12px', backgroundColor: '#F3F4F6', borderRadius: '4px', width: '35%', marginBottom: '10px' }} />
        <div style={{ height: '18px', backgroundColor: '#F3F4F6', borderRadius: '4px', width: '85%', marginBottom: '8px' }} />
        <div style={{ height: '14px', backgroundColor: '#F3F4F6', borderRadius: '4px', width: '55%' }} />
      </div>
    </div>
  ));

  return (
    <div>
      <section style={heroStyle}>
        <div style={{ position: 'absolute', top: '-120px', right: '-120px', width: '500px', height: '500px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', top: '20%', left: '5%', fontSize: '60px', opacity: 0.12, pointerEvents: 'none' }}>🥦</div>
        <div style={{ position: 'absolute', top: '30%', right: '8%', fontSize: '50px', opacity: 0.1, pointerEvents: 'none' }}>🍅</div>
        <div style={{ position: 'absolute', bottom: '20%', right: '12%', fontSize: '55px', opacity: 0.1, pointerEvents: 'none' }}>🫑</div>
        <div style={{ position: 'absolute', top: '60%', left: '10%', fontSize: '45px', opacity: 0.09, pointerEvents: 'none' }}>🥕</div>

        <h1 style={heroTitleStyle}>Cook Smarter.<br />Eat Better.</h1>
        <p style={heroSubStyle}>
          Discover thousands of recipes, plan your weekly meals, track your nutrition, and generate smart shopping lists — all in one beautiful app.
        </p>

        <form onSubmit={handleSearch} style={searchBarStyle}>
          <input
            type="text"
            placeholder="Search recipes, cuisines, ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle}
          />
          <button type="submit" style={searchBtnStyle}>Search</button>
        </form>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button style={ctaBtnStyle} onClick={() => navigate('/recipes')}>Browse Recipes</button>
          <button
            style={ghostBtnStyle}
            onClick={() => navigate(token ? '/recipes/create' : '/recipes')}
          >
            {token ? 'Create Recipe' : 'Start Planning'}
          </button>
        </div>
      </section>

      <div style={statsBarStyle}>
        {[
          { value: '1,200+', label: 'Recipes', icon: '🍽' },
          { value: '50,000+', label: 'Meals Planned', icon: '📅' },
          { value: '15,000+', label: 'Happy Users', icon: '👨‍🍳' },
          { value: '4.9★', label: 'Average Rating', icon: '⭐' },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{stat.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#52B788' }}>{stat.value}</div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Featured Recipes</h2>
        <p style={sectionSubStyle}>Handpicked recipes to inspire your next meal</p>
        {featuredLoading ? (
          <div style={recipesGridStyle}>{skeletonRecipeCards}</div>
        ) : featuredRecipes.length > 0 ? (
          <>
            <div style={recipesGridStyle}>
              {featuredRecipes.map((recipe) => (
                <RecipeCard key={recipe._id} recipe={recipe} />
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '48px' }}>
              <button
                style={{ ...ctaBtnStyle, backgroundColor: '#2D6A4F', fontSize: '16px', padding: '14px 32px' }}
                onClick={() => navigate('/recipes')}
              >
                View All Recipes →
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🍳</div>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No recipes yet. Be the first to add one!</p>
            <button
              style={{ ...ctaBtnStyle, marginTop: '20px', fontSize: '16px', padding: '12px 28px' }}
              onClick={() => navigate(token ? '/recipes/create' : '/recipes')}
            >
              {token ? 'Add First Recipe' : 'Browse Recipes'}
            </button>
          </div>
        )}
      </section>

      <section style={{ backgroundColor: '#F9FAFB', padding: '72px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={sectionTitleStyle}>Browse by Cuisine</h2>
          <p style={sectionSubStyle}>Find recipes from cuisines around the world</p>
          <div style={cuisineGridStyle}>
            {CUISINES_WITH_EMOJI.map((c) => (
              <div
                key={c.name}
                style={cuisineCardStyle}
                onClick={() => navigate(`/recipes?cuisine=${encodeURIComponent(c.name)}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>{c.emoji}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={stepsContainerStyle}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ ...sectionTitleStyle, textAlign: 'center', marginBottom: '8px' }}>How It Works</h2>
          <p style={{ ...sectionSubStyle, textAlign: 'center', marginBottom: '56px' }}>Four simple steps to healthier, smarter eating</p>
          <div style={stepsGridStyle}>
            {steps.map((step) => (
              <div key={step.number} style={stepCardStyle}>
                <div style={stepNumberStyle}>{step.number}</div>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>{step.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937', marginBottom: '12px' }}>{step.title}</h3>
                <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.7', margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>What People Say</h2>
        <p style={sectionSubStyle}>Thousands of home cooks trust MealPlanner every day</p>
        <div style={testimonialGridStyle}>
          {TESTIMONIALS.map((t) => (
            <div key={t.name} style={testimonialCardStyle}>
              <div style={{ position: 'absolute', top: '20px', right: '24px', fontSize: '40px', opacity: 0.08, color: t.color }}>❝</div>
              <div style={{ fontSize: '22px', color: '#F59E0B', marginBottom: '16px', letterSpacing: '2px' }}>★★★★★</div>
              <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: '1.8', marginBottom: '20px', fontStyle: 'italic', margin: '0 0 20px 0' }}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: t.color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '16px',
                  flexShrink: 0,
                }}>
                  {t.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#1F2937', fontSize: '14px' }}>{t.name}</div>
                  <div style={{ color: '#9CA3AF', fontSize: '12px' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={ctaSectionStyle}>
        <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#FEFAE0', marginBottom: '16px', letterSpacing: '-1px', margin: '0 0 16px 0' }}>
          Ready to Eat Better?
        </h2>
        <p style={{ fontSize: '18px', color: 'rgba(254,250,224,0.75)', maxWidth: '480px', margin: '0 auto 40px auto', lineHeight: '1.7' }}>
          Join 15,000+ home cooks who plan smarter and eat healthier every single week.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={ctaBtnStyle} onClick={() => navigate('/recipes')}>Get Started Free</button>
          {token && (
            <button style={ghostBtnStyle} onClick={() => navigate('/recipes/create')}>Create Recipe</button>
          )}
        </div>
      </section>

      <footer style={footerStyle}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', marginBottom: '48px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#FEFAE0', marginBottom: '12px' }}>🍽 MealPlanner</div>
              <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.7', margin: 0 }}>Plan smarter. Eat better. Every week.</p>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#FEFAE0', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Features</div>
              {['Recipes', 'Meal Planner', 'Shopping List', 'Nutrition'].map((link) => (
                <div key={link} style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', cursor: 'pointer' }} onClick={() => navigate(link === 'Recipes' ? '/recipes' : link === 'Meal Planner' ? '/planner' : link === 'Shopping List' ? '/shopping' : '/planner')}>
                  {link}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#FEFAE0', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cuisines</div>
              {['Italian', 'Mexican', 'Asian', 'Mediterranean'].map((c) => (
                <div key={c} style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', cursor: 'pointer' }} onClick={() => navigate(`/recipes?cuisine=${c}`)}>
                  {c}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#FEFAE0', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account</div>
              {token ? (
                <>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', cursor: 'pointer' }} onClick={() => navigate('/profile')}>My Profile</div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', cursor: 'pointer' }} onClick={() => navigate('/recipes/create')}>Create Recipe</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Sign In</div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Register</div>
                </>
              )}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1F2937', paddingTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#4B5563', margin: 0 }}>
              © {new Date().getFullYear()} MealPlanner. Built with love for home cooks everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
