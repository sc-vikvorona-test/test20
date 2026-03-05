import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCollections, createCollection } from '../services/api.js';
import { useStore } from '../store/index.js';

const COLLECTION_GRADIENTS = [
  'linear-gradient(135deg, #2D6A4F, #52B788)',
  'linear-gradient(135deg, #F4A261, #E76F51)',
  'linear-gradient(135deg, #457B9D, #1D3557)',
  'linear-gradient(135deg, #E9C46A, #F4A261)',
  'linear-gradient(135deg, #A8DADC, #457B9D)',
  'linear-gradient(135deg, #606C38, #283618)',
  'linear-gradient(135deg, #DDA15E, #BC6C25)',
  'linear-gradient(135deg, #8338EC, #3A86FF)',
];

const CreateModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await createCollection({ name: name.trim(), description: description.trim(), isPublic });
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1F2937' }}>New Collection</h2>
          <button
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9CA3AF', lineHeight: 1 }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Collection Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weeknight Dinners"
              maxLength={80}
              required
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this collection about?"
              maxLength={300}
              rows={3}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: isPublic ? '#2D6A4F' : '#D1D5DB',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: '3px',
                left: isPublic ? '23px' : '3px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
            <span style={{ fontSize: '14px', color: '#374151' }}>
              {isPublic ? 'Public — anyone can discover this collection' : 'Private — only you can see this'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#fff', color: '#374151', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: loading || !name.trim() ? '#9CA3AF' : '#2D6A4F', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: loading || !name.trim() ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Creating...' : 'Create Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Collections = () => {
  const navigate = useNavigate();
  const { token } = useStore();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchCollections();
  }, [token]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await getCollections();
      setCollections(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = (newCollection) => {
    setCollections((prev) => [newCollection, ...prev]);
  };

  const containerStyle = {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '40px 24px',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '36px',
    flexWrap: 'wrap',
    gap: '16px',
  };

  const titleStyle = {
    fontSize: '34px',
    fontWeight: '800',
    color: '#2D6A4F',
    margin: '0 0 6px 0',
  };

  const newBtnStyle = {
    backgroundColor: '#F4A261',
    color: '#fff',
    border: 'none',
    padding: '12px 22px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(244,162,97,0.3)',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  };

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    border: '1px solid #F3F4F6',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

  const emptyCoverStyle = (index) => ({
    height: '160px',
    background: COLLECTION_GRADIENTS[index % COLLECTION_GRADIENTS.length],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
  });

  const coverImgStyle = {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
  };

  const cardBodyStyle = {
    padding: '16px',
  };

  const cardTitleStyle = {
    fontSize: '17px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '6px',
  };

  const cardDescStyle = {
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '12px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const badgeStyle = (isPublic) => ({
    display: 'inline-block',
    backgroundColor: isPublic ? '#D1FAE5' : '#FEF3C7',
    color: isPublic ? '#065F46' : '#92400E',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
  });

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '80px 24px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px', fontSize: '48px' }}>⏳</div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>My Collections</h1>
          <p style={{ color: '#6B7280', margin: 0 }}>Organize your favorite recipes into boards</p>
        </div>
        <button style={newBtnStyle} onClick={() => setShowModal(true)}>
          + New Collection
        </button>
      </div>

      {collections.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1F2937', marginBottom: '8px' }}>No collections yet</h2>
          <p style={{ color: '#6B7280', marginBottom: '24px', fontSize: '15px' }}>Create your first one to start organizing your recipes!</p>
          <button
            style={{ ...newBtnStyle, display: 'inline-block' }}
            onClick={() => setShowModal(true)}
          >
            + New Collection
          </button>
        </div>
      ) : (
        <div style={gridStyle}>
          {collections.map((col, index) => (
            <div
              key={col._id}
              style={cardStyle}
              onClick={() => navigate(`/collections/${col._id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
              }}
            >
              {col.coverImage ? (
                <img src={col.coverImage} alt={col.name} style={coverImgStyle} />
              ) : (
                <div style={emptyCoverStyle(index)}>📖</div>
              )}
              <div style={cardBodyStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h3 style={cardTitleStyle}>{col.name}</h3>
                  <span style={badgeStyle(col.isPublic)}>{col.isPublic ? 'Public' : 'Private'}</span>
                </div>
                {col.description && <p style={cardDescStyle}>{col.description}</p>}
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0, fontWeight: '500' }}>
                  {col.recipes?.length || 0} {col.recipes?.length === 1 ? 'recipe' : 'recipes'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
};

export default Collections;
