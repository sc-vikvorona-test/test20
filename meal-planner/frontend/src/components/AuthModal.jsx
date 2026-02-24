import { useState } from 'react';
import useAuth from '../hooks/useAuth.js';

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const { login, register, loading, error } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    try {
      if (mode === 'login') {
        await login({ email: formData.email, password: formData.password });
      } else {
        if (!formData.name.trim()) {
          setLocalError('Name is required');
          return;
        }
        await register({ name: formData.name, email: formData.email, password: formData.password });
      }
      onClose();
      setFormData({ name: '', email: '', password: '' });
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setLocalError('');
    setFormData({ name: '', email: '', password: '' });
  };

  if (!isOpen) return null;

  const overlayStyle = {
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
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    position: 'relative',
  };

  const closeBtnStyle = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#9CA3AF',
    lineHeight: 1,
  };

  const titleStyle = {
    fontSize: '26px',
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: '8px',
    textAlign: 'center',
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: '28px',
  };

  const inputGroupStyle = {
    marginBottom: '16px',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '8px',
    border: '1.5px solid #D1D5DB',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1F2937',
    transition: 'border-color 0.2s',
  };

  const submitBtnStyle = {
    width: '100%',
    backgroundColor: '#2D6A4F',
    color: '#FEFAE0',
    border: 'none',
    padding: '13px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    marginTop: '8px',
    transition: 'background-color 0.2s',
  };

  const switchStyle = {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#6B7280',
  };

  const switchLinkStyle = {
    color: '#2D6A4F',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
  };

  const errorStyle = {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#DC2626',
    fontSize: '13px',
    marginBottom: '16px',
  };

  const tabsStyle = {
    display: 'flex',
    borderRadius: '8px',
    backgroundColor: '#F3F4F6',
    padding: '4px',
    marginBottom: '28px',
  };

  const tabStyle = (active) => ({
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: active ? '#fff' : 'transparent',
    color: active ? '#2D6A4F' : '#6B7280',
    fontWeight: active ? '700' : '500',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.2s',
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtnStyle} onClick={onClose}>×</button>

        <h2 style={titleStyle}>{mode === 'login' ? 'Welcome back!' : 'Create account'}</h2>
        <p style={subtitleStyle}>{mode === 'login' ? 'Sign in to your meal planner' : 'Start planning your meals today'}</p>

        <div style={tabsStyle}>
          <button style={tabStyle(mode === 'login')} onClick={() => switchMode('login')}>Sign In</button>
          <button style={tabStyle(mode === 'register')} onClick={() => switchMode('register')}>Register</button>
        </div>

        {(localError || error) && (
          <div style={errorStyle}>{localError || error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2D6A4F'}
                onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                required
              />
            </div>
          )}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#2D6A4F'}
              onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              required
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              placeholder={mode === 'register' ? 'Min. 6 characters' : 'Your password'}
              value={formData.password}
              onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#2D6A4F'}
              onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              required
            />
          </div>
          <button type="submit" style={submitBtnStyle} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={switchStyle}>
          {mode === 'login' ? (
            <>Don't have an account? <span style={switchLinkStyle} onClick={() => switchMode('register')}>Sign up</span></>
          ) : (
            <>Already have an account? <span style={switchLinkStyle} onClick={() => switchMode('login')}>Sign in</span></>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;