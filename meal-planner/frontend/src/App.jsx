import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home.jsx';
import RecipeList from './pages/RecipeList.jsx';
import RecipeDetail from './pages/RecipeDetail.jsx';
import MealPlanner from './pages/MealPlanner.jsx';
import ShoppingList from './pages/ShoppingList.jsx';
import CreateRecipe from './pages/CreateRecipe.jsx';
import EditRecipe from './pages/EditRecipe.jsx';
import UserProfile from './pages/UserProfile.jsx';
import Collections from './pages/Collections.jsx';
import CollectionDetail from './pages/CollectionDetail.jsx';
import AuthModal from './components/AuthModal.jsx';
import { useStore } from './store/index.js';
import { getMe } from './services/api.js';
import { createContext } from 'react';

export const AuthContext = createContext(null);

const Navbar = () => {
  const { user, token, logout } = useStore();
  const navigate = useNavigate();
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

  const createBtnStyle = {
    backgroundColor: '#F4A261',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  };

  return (
    <>
      <nav style={navStyle}>
        <Link to="/" style={logoStyle}>🍽 MealPlanner</Link>
        <div style={navLinksStyle}>
          <Link to="/recipes" style={linkStyle}>Recipes</Link>
          {token && <Link to="/planner" style={linkStyle}>Meal Planner</Link>}
          {token && <Link to="/shopping" style={linkStyle}>Shopping</Link>}
          {token && <Link to="/collections" style={linkStyle}>Collections</Link>}
          {token && (
            <Link to="/recipes/create" style={createBtnStyle}>+ Create Recipe</Link>
          )}
          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link to="/profile" style={{ ...linkStyle, fontWeight: '600' }}>
                {user?.name?.split(' ')[0]}
              </Link>
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
  const { token, setUser, setFavorites } = useStore();

  useEffect(() => {
    if (token) {
      getMe().then((res) => {
        setUser(res.data);
        if (res.data.favorites) {
          setFavorites(res.data.favorites.map((f) => (typeof f === 'string' ? f : f._id)));
        }
      }).catch(() => {});
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
            <Route path="/recipes/create" element={<CreateRecipe />} />
            <Route path="/recipes/:id/edit" element={<EditRecipe />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/planner" element={<MealPlanner />} />
            <Route path="/shopping" element={<ShoppingList />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/collections/:id" element={<CollectionDetail />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
