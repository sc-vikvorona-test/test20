import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import Home from './pages/Home.jsx';
import RecipeList from './pages/RecipeList.jsx';
import RecipeDetail from './pages/RecipeDetail.jsx';
import MealPlanner from './pages/MealPlanner.jsx';
import ShoppingList from './pages/ShoppingList.jsx';
import AuthModal from './components/AuthModal.jsx';
import { useStore } from './store/index.js';
import { getMe } from './services/api.js';

export const AuthContext = createContext(null);

const Navbar = () => {
  const { user, token, logout } = useStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const navStyle = {
    backgroundColor: '#2D6A4F',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const logoStyle = {
    color: '#FEFAE0',
    fontSize: '20px',
    fontWeight: '700',
    textDecoration: 'none',
    letterSpacing: '-0.5px',
  };

  const navLinksStyle = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  };

  const linkStyle = {
    color: '#FEFAE0',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  };

  const btnStyle = {
    backgroundColor: '#F4A261',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const logoutBtnStyle = {
    backgroundColor: 'transparent',
    color: '#FEFAE0',
    border: '1px solid rgba(254,250,224,0.4)',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  };

  return (
    <>
      <nav style={navStyle}>
        <Link to="/" style={logoStyle}>🍽 MealPlanner</Link>
        <div style={navLinksStyle}>
          <Link to="/recipes" style={linkStyle}>Recipes</Link>
          {token && <Link to="/planner" style={linkStyle}>Meal Planner</Link>}
          {token && <Link to="/shopping" style={linkStyle}>Shopping</Link>}
          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#FEFAE0', fontSize: '14px' }}>Hi, {user?.name?.split(' ')[0]}</span>
              <button style={logoutBtnStyle} onClick={logout}>Logout</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ ...btnStyle, backgroundColor: 'transparent', border: '1px solid rgba(254,250,224,0.5)', color: '#FEFAE0' }} onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}>Login</button>
              <button style={btnStyle} onClick={() => { setAuthMode('register'); setAuthModalOpen(true); }}>Sign Up</button>
            </div>
          )}
        </div>
      </nav>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />
    </>
  );
};

const AuthProvider = ({ children }) => {
  const { token, setUser } = useStore();

  useEffect(() => {
    if (token) {
      getMe().then((res) => setUser(res.data)).catch(() => {});
    }
  }, [token]);

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ minHeight: '100vh', backgroundColor: '#FEFAE0', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/recipes" element={<RecipeList />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/planner" element={<MealPlanner />} />
            <Route path="/shopping" element={<ShoppingList />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;