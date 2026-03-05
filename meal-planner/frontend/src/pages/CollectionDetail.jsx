import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCollection, updateCollection, deleteCollection, addToCollection, removeFromCollection } from '../services/api.js';
import { getRecipes } from '../services/api.js';
import RecipeCard from '../components/RecipeCard.jsx';
import { useStore } from '../store/index.js';

const AddRecipeModal = ({ collectionId, existingIds, onClose, onAdded }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);

  const searchRecipes = async (q) => {
    setLoading(true);
    try {
      const res = await getRecipes({ q, limit: 20 });
      setResults(res.data.recipes || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchRecipes('');
  }, []);

  const handleAdd = async (recipeId) => {
    setAdding(recipeId);
    try {
      const res = await addToCollection(collectionId, recipeId);
      onAdded(res.data);
    } catch {
    } finally {
      setAdding(null);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>Add Recipe</h2>
          <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9CA3AF' }} onClick={onClose}>×</button>
        </div>

        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); searchRecipes(e.target.value); }}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
          autoFocus
        />

        {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>Searching...</div>}

        {!loading && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🍳</div>
            <p style={{ margin: 0 }}>No recipes found</p>
          </div>
        )}

        {results.map((recipe) => {
          const alreadyAdded = existingIds.includes(recipe._id);
          return (
            <div
              key={recipe._id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '8px', backgroundColor: alreadyAdded ? '#F9FAFB' : '#fff' }}
            >
              <div>
                <div style={{ fontWeight: '600', color: '#1F2937', fontSize: '14px', marginBottom: '2px' }}>{recipe.title}</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{recipe.cuisine} · {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</div>
              </div>
              {alreadyAdded ? (
                <span style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>Added</span>
              ) : (
                <button
                  onClick={() => handleAdd(recipe._id)}
                  disabled={adding === recipe._id}
                  style={{ backgroundColor: adding === recipe._id ? '#9CA3AF' : '#2D6A4F', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: adding === recipe._id ? 'not-allowed' : 'pointer' }}
                >
                  {adding === recipe._id ? '...' : '+ Add'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CollectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useStore();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPublic, setEditPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    fetchCollection();
  }, [id]);

  const fetchCollection = async () => {
    setLoading(true);
    try {
      const res = await getCollection(id);
      setCollection(res.data);
      setEditName(res.data.name);
      setEditDesc(res.data.description || '');
      setEditPublic(res.data.isPublic);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await updateCollection(id, { name: editName, description: editDesc, isPublic: editPublic });
      setCollection((prev) => ({ ...prev, name: res.data.name, description: res.data.description, isPublic: res.data.isPublic }));
      setEditMode(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this collection?')) return;
    setDeleting(true);
    try {
      await deleteCollection(id);
      navigate('/collections');
    } catch {
      setDeleting(false);
    }
  };

  const handleRemoveRecipe = async (recipeId) => {
    setRemoving(recipeId);
    try {
      await removeFromCollection(id, recipeId);
      setCollection((prev) => ({ ...prev, recipes: prev.recipes.filter((r) => r._id !== recipeId) }));
    } catch {
    } finally {
      setRemoving(null);
    }
  };

  const handleAdded = (updatedCollection) => {
    fetchCollection();
  };

  const containerStyle = {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '40px 24px',
  };

  const headerStyle = {
    marginBottom: '32px',
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

  const titleStyle = {
    fontSize: '36px',
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: '8px',
  };

  const badgeStyle = (isPublic) => ({
    display: 'inline-block',
    backgroundColor: isPublic ? '#D1FAE5' : '#FEF3C7',
    color: isPublic ? '#065F46' : '#92400E',
    padding: '3px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    marginLeft: '10px',
  });

  const actionBtnStyle = (color, bg, borderColor) => ({
    backgroundColor: bg,
    color,
    border: `1px solid ${borderColor}`,
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  });

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '12px',
    fontFamily: 'inherit',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '24px',
  };

  const isOwner = user && collection && (collection.user === user.id || collection.user?._id === user.id || collection.user?.toString() === user.id);
  const existingIds = collection?.recipes?.map((r) => r._id) || [];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px', fontSize: '48px' }}>⏳</div>
    );
  }

  if (!collection) {
    return (
      <div style={{ ...containerStyle, textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>😕</div>
        <h2 style={{ color: '#1F2937', marginBottom: '16px' }}>Collection not found</h2>
        <button style={{ ...backBtnStyle, color: '#2D6A4F', borderColor: '#2D6A4F' }} onClick={() => navigate('/collections')}>
          Back to Collections
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <button style={backBtnStyle} onClick={() => navigate('/collections')}>← Back to Collections</button>

      <div style={headerStyle}>
        {editMode ? (
          <div style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={80}
              style={inputStyle}
              placeholder="Collection name"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              maxLength={300}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', marginBottom: '16px' }}
              placeholder="Description"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setEditPublic(!editPublic)}
                style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', backgroundColor: editPublic ? '#2D6A4F' : '#D1D5DB', cursor: 'pointer', position: 'relative', flexShrink: 0 }}
              >
                <span style={{ position: 'absolute', top: '3px', left: editPublic ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
              <span style={{ fontSize: '14px', color: '#374151' }}>{editPublic ? 'Public' : 'Private'}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditMode(false)} style={actionBtnStyle('#374151', '#fff', '#D1D5DB')}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} style={actionBtnStyle('#fff', saving ? '#9CA3AF' : '#2D6A4F', saving ? '#9CA3AF' : '#2D6A4F')}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <h1 style={titleStyle}>{collection.name}</h1>
              <span style={badgeStyle(collection.isPublic)}>{collection.isPublic ? 'Public' : 'Private'}</span>
            </div>
            {collection.description && (
              <p style={{ color: '#6B7280', fontSize: '16px', marginBottom: '12px', lineHeight: '1.6' }}>{collection.description}</p>
            )}
            <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
              {collection.recipes?.length || 0} {collection.recipes?.length === 1 ? 'recipe' : 'recipes'}
            </p>
            {isOwner && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setEditMode(true)} style={actionBtnStyle('#2D6A4F', '#F0FDF4', '#BBF7D0')}>
                  Edit Collection
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={actionBtnStyle('#DC2626', '#FEF2F2', '#FECACA')}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button onClick={() => setShowAddModal(true)} style={actionBtnStyle('#fff', '#F4A261', '#F4A261')}>
                  + Add Recipe
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {collection.recipes?.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>🍽</div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', marginBottom: '8px' }}>No recipes yet</h3>
          <p style={{ color: '#6B7280', marginBottom: '24px' }}>Add recipes to this collection to get started.</p>
          {isOwner && (
            <button onClick={() => setShowAddModal(true)} style={{ backgroundColor: '#F4A261', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              + Add Recipe
            </button>
          )}
        </div>
      ) : (
        <div style={gridStyle}>
          {collection.recipes.map((recipe) => (
            <div key={recipe._id} style={{ position: 'relative' }}>
              <RecipeCard recipe={recipe} />
              {isOwner && (
                <button
                  onClick={() => handleRemoveRecipe(recipe._id)}
                  disabled={removing === recipe._id}
                  style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(255,255,255,0.9)', color: '#DC2626', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: '600', cursor: removing === recipe._id ? 'not-allowed' : 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                >
                  {removing === recipe._id ? '...' : 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddRecipeModal
          collectionId={id}
          existingIds={existingIds}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
};

export default CollectionDetail;
