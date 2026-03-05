import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import { getMyRecipes, getFavorites, updateProfile, changePassword } from '../services/api.js';
import RecipeCard from '../components/RecipeCard.jsx';

const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 'keto', 'paleo'];

const UserProfile = () => {
  const navigate = useNavigate();
  const { token, user, setUser } = useStore();
  const [activeTab, setActiveTab] = useState('recipes');
  const [myRecipes, setMyRecipes] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', bio: '', avatar: '', dietaryPreferences: [] });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchMyRecipes();
  }, [token]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        dietaryPreferences: user.dietaryPreferences || [],
      });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'favorites' && favorites.length === 0 && !favoritesLoading) {
      fetchFavorites();
    }
  }, [activeTab]);

  const fetchMyRecipes = async () => {
    setLoading(true);
    try {
      const res = await getMyRecipes();
      setMyRecipes(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    setFavoritesLoading(true);
    try {
      const res = await getFavorites();
      setFavorites(res.data);
    } catch {
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await updateProfile(profileForm);
      setUser(res.data);
      setProfileSuccess('Profile updated successfully');
      setTimeout(() => {
        setShowEditProfile(false);
        setProfileSuccess('');
      }, 1500);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordSuccess('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const toggleDietaryPref = (pref) => {
    setProfileForm((prev) => ({
      ...prev,
      dietaryPreferences: prev.dietaryPreferences.includes(pref)
        ? prev.dietaryPreferences.filter((p) => p !== pref)
        : [...prev.dietaryPreferences, pref],
    }));
  };

  const containerStyle = {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '40px 24px',
  };

  const profileCardStyle = {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    marginBottom: '32px',
    display: 'flex',
    gap: '28px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  };

  const avatarStyle = {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#2D6A4F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    color: '#FEFAE0',
    fontWeight: '700',
    flexShrink: 0,
  };

  const statsRowStyle = {
    display: 'flex',
    gap: '24px',
    marginTop: '16px',
    flexWrap: 'wrap',
  };

  const statItemStyle = {
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
    padding: '12px 20px',
    borderRadius: '10px',
    minWidth: '80px',
  };

  const tabBarStyle = {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#F3F4F6',
    padding: '4px',
    borderRadius: '10px',
    marginBottom: '28px',
    width: 'fit-content',
  };

  const tabStyle = (active) => ({
    padding: '8px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: active ? '#fff' : 'transparent',
    color: active ? '#2D6A4F' : '#6B7280',
    fontWeight: active ? '600' : '400',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.2s',
  });

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  };

  const createBtnStyle = {
    backgroundColor: '#F4A261',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '24px',
  };

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '60px 24px',
    color: '#9CA3AF',
  };

  const editBtnStyle = {
    backgroundColor: '#F0FDF4',
    color: '#2D6A4F',
    border: '1px solid #BBF7D0',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  };

  const modalStyle = {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    color: '#1F2937',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  };

  const saveBtnStyle = {
    backgroundColor: '#2D6A4F',
    color: '#FEFAE0',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: profileLoading ? 'not-allowed' : 'pointer',
    opacity: profileLoading ? 0.7 : 1,
  };

  const cancelBtnStyle = {
    backgroundColor: 'transparent',
    color: '#6B7280',
    border: '1px solid #D1D5DB',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: '10px',
  };

  const dietaryChipStyle = (active) => ({
    padding: '4px 10px',
    borderRadius: '14px',
    border: active ? '2px solid #2D6A4F' : '1px solid #D1D5DB',
    backgroundColor: active ? '#D1FAE5' : '#fff',
    color: active ? '#065F46' : '#6B7280',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    userSelect: 'none',
  });

  if (!token) return null;

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const totalFavorites = favorites.length || (user?.favorites?.length ?? 0);

  return (
    <div style={containerStyle}>
      <div style={profileCardStyle}>
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} style={{ ...avatarStyle, objectFit: 'cover' }} />
        ) : (
          <div style={avatarStyle}>{initials}</div>
        )}

        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1F2937', margin: 0 }}>{user?.name}</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={editBtnStyle} onClick={() => setShowEditProfile(true)}>Edit Profile</button>
              <button style={{ ...editBtnStyle, backgroundColor: '#FFF7ED', color: '#C2410C', borderColor: '#FED7AA' }} onClick={() => setShowChangePassword(true)}>Change Password</button>
            </div>
          </div>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 8px 0' }}>{user?.email}</p>
          {user?.bio && (
            <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px 0', maxWidth: '500px' }}>{user.bio}</p>
          )}
          <p style={{ color: '#9CA3AF', fontSize: '13px', margin: 0 }}>Member since {memberSince}</p>

          {user?.dietaryPreferences?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
              {user.dietaryPreferences.map((pref) => (
                <span key={pref} style={{
                  backgroundColor: '#D1FAE5',
                  color: '#065F46',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                }}>
                  {pref}
                </span>
              ))}
            </div>
          )}

          <div style={statsRowStyle}>
            <div style={statItemStyle}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#2D6A4F' }}>{myRecipes.length}</div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>Recipes</div>
            </div>
            <div style={statItemStyle}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#F4A261' }}>{totalFavorites}</div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>Favorites</div>
            </div>
          </div>
        </div>
      </div>

      <div style={tabBarStyle}>
        <button style={tabStyle(activeTab === 'recipes')} onClick={() => setActiveTab('recipes')}>
          My Recipes ({myRecipes.length})
        </button>
        <button style={tabStyle(activeTab === 'favorites')} onClick={() => setActiveTab('favorites')}>
          Favorites ({totalFavorites})
        </button>
      </div>

      {activeTab === 'recipes' && (
        <div>
          <button style={createBtnStyle} onClick={() => navigate('/recipes/create')}>
            + Create New Recipe
          </button>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', fontSize: '40px' }}>⏳</div>
          ) : myRecipes.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🍳</div>
              <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No recipes yet</p>
              <p style={{ fontSize: '14px', marginBottom: '20px' }}>Share your first recipe with the community!</p>
              <button
                style={{ ...createBtnStyle, marginBottom: 0 }}
                onClick={() => navigate('/recipes/create')}
              >
                Create Your First Recipe
              </button>
            </div>
          ) : (
            <div style={gridStyle}>
              {myRecipes.map((recipe) => (
                <RecipeCard key={recipe._id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div>
          {favoritesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', fontSize: '40px' }}>⏳</div>
          ) : favorites.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>❤️</div>
              <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No favorites yet</p>
              <p style={{ fontSize: '14px', marginBottom: '20px' }}>Browse recipes and save your favorites!</p>
              <button
                style={{ ...createBtnStyle, marginBottom: 0, backgroundColor: '#2D6A4F' }}
                onClick={() => navigate('/recipes')}
              >
                Browse Recipes
              </button>
            </div>
          ) : (
            <div style={gridStyle}>
              {favorites.map((recipe) => (
                <RecipeCard key={recipe._id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      )}

      {showEditProfile && (
        <div style={modalOverlayStyle} onClick={() => setShowEditProfile(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>Edit Profile</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9CA3AF' }} onClick={() => setShowEditProfile(false)}>×</button>
            </div>

            {profileError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#16A34A', fontSize: '13px' }}>
                {profileSuccess}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Bio <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(max 300 chars)</span></label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                maxLength={300}
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                placeholder="Tell us about yourself..."
              />
              <div style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'right', marginTop: '2px' }}>{profileForm.bio.length}/300</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Avatar URL</label>
              <input
                type="text"
                value={profileForm.avatar}
                onChange={(e) => setProfileForm((p) => ({ ...p, avatar: e.target.value }))}
                style={inputStyle}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Dietary Preferences</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DIETARY_OPTIONS.map((pref) => (
                  <span
                    key={pref}
                    style={dietaryChipStyle(profileForm.dietaryPreferences.includes(pref))}
                    onClick={() => toggleDietaryPref(pref)}
                  >
                    {pref}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <button style={saveBtnStyle} onClick={handleProfileSave} disabled={profileLoading}>
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button style={cancelBtnStyle} onClick={() => setShowEditProfile(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div style={modalOverlayStyle} onClick={() => setShowChangePassword(false)}>
          <div style={{ ...modalStyle, maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>Change Password</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9CA3AF' }} onClick={() => setShowChangePassword(false)}>×</button>
            </div>

            {passwordError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#DC2626', fontSize: '13px' }}>
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#16A34A', fontSize: '13px' }}>
                {passwordSuccess}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div>
              <button
                style={{ ...saveBtnStyle, cursor: passwordLoading ? 'not-allowed' : 'pointer', opacity: passwordLoading ? 0.7 : 1 }}
                onClick={handlePasswordSave}
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Saving...' : 'Change Password'}
              </button>
              <button style={cancelBtnStyle} onClick={() => setShowChangePassword(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
