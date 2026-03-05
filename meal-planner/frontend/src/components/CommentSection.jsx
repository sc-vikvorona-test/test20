import { useState, useEffect } from 'react';
import { getComments, createComment, deleteComment } from '../services/api.js';
import { useStore } from '../store/index.js';

const StarRating = ({ value, onChange, size = 20 }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          style={{
            fontSize: `${size}px`,
            cursor: onChange ? 'pointer' : 'default',
            color: star <= (hovered || value) ? '#F59E0B' : '#D1D5DB',
            transition: 'color 0.1s',
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const InitialsAvatar = ({ name }) => {
  const initials = (name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['#2D6A4F', '#457B9D', '#E76F51', '#F4A261', '#8338EC', '#3A86FF'];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div style={{
      width: '38px',
      height: '38px',
      borderRadius: '50%',
      backgroundColor: colors[colorIndex],
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '700',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const CommentSection = ({ recipeId, recipeAuthorId }) => {
  const { token, user } = useStore();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchComments(1);
  }, [recipeId]);

  const fetchComments = async (p) => {
    setLoading(true);
    try {
      const res = await getComments(recipeId, { page: p, limit: 10 });
      if (p === 1) {
        setComments(res.data.comments);
      } else {
        setComments((prev) => [...prev, ...res.data.comments]);
      }
      setTotal(res.data.total);
      setPage(res.data.page);
      setPages(res.data.pages);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please select a star rating'); return; }
    if (text.trim().length < 10) { setError('Review must be at least 10 characters'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await createComment(recipeId, { text: text.trim(), rating });
      setComments((prev) => [res.data, ...prev]);
      setTotal((t) => t + 1);
      setText('');
      setRating(0);
      setSuccess('Review submitted!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    setDeleting(commentId);
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      setTotal((t) => t - 1);
    } catch {
    } finally {
      setDeleting(null);
    }
  };

  const sectionStyle = {
    marginTop: '48px',
    paddingTop: '32px',
    borderTop: '2px solid #E5E7EB',
  };

  const headingStyle = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '24px',
  };

  const formStyle = {
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
  };

  const textareaStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    marginTop: '12px',
    marginBottom: '12px',
  };

  const submitBtnStyle = {
    backgroundColor: submitting || !rating ? '#9CA3AF' : '#2D6A4F',
    color: '#fff',
    border: 'none',
    padding: '10px 22px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: submitting || !rating ? 'not-allowed' : 'pointer',
  };

  const commentCardStyle = {
    backgroundColor: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '14px',
  };

  const userAlreadyCommented = comments.some(
    (c) => c.user?._id === user?.id || c.user?._id === user?._id
  );

  return (
    <div style={sectionStyle}>
      <h2 style={headingStyle}>Reviews {total > 0 && <span style={{ fontSize: '16px', fontWeight: '400', color: '#9CA3AF' }}>({total})</span>}</h2>

      {token && !userAlreadyCommented && (
        <div style={formStyle}>
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#374151', margin: '0 0 12px 0' }}>Leave a Review</p>
          <StarRating value={rating} onChange={setRating} size={24} />

          {error && (
            <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginTop: '10px' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginTop: '10px' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your thoughts about this recipe... (min 10 characters)"
              rows={4}
              maxLength={500}
              style={textareaStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{text.length}/500</span>
              <button type="submit" disabled={submitting || !rating} style={submitBtnStyle}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Loading reviews...</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
          <p style={{ color: '#6B7280', fontSize: '15px', margin: 0 }}>No reviews yet. Be the first!</p>
        </div>
      ) : (
        <>
          {comments.map((comment) => {
            const isOwner = comment.user?._id === user?.id || comment.user?._id === user?._id;
            const isAuthor = recipeAuthorId && (recipeAuthorId === user?.id || recipeAuthorId === user?._id);
            const canDelete = isOwner || isAuthor;

            return (
              <div key={comment._id} style={commentCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <InitialsAvatar name={comment.user?.name} />
                    <div>
                      <div style={{ fontWeight: '600', color: '#1F2937', fontSize: '14px' }}>{comment.user?.name || 'Anonymous'}</div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatDate(comment.createdAt)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <StarRating value={comment.rating} size={14} />
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment._id)}
                        disabled={deleting === comment._id}
                        style={{ backgroundColor: 'transparent', color: '#9CA3AF', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px 6px', borderRadius: '4px' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{comment.text}</p>
              </div>
            );
          })}

          {page < pages && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                onClick={() => fetchComments(page + 1)}
                disabled={loading}
                style={{ backgroundColor: '#F9FAFB', color: '#2D6A4F', border: '1px solid #D1FAE5', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Loading...' : 'Load More Reviews'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommentSection;
