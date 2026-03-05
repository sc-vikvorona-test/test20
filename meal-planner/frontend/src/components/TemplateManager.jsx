import { useState, useEffect } from 'react';
import { getTemplates, saveWeekAsTemplate, deleteTemplate, applyTemplate } from '../services/api.js';

const TemplateManager = ({ currentWeekStart, onApplyTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [applying, setApplying] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [applySuccess, setApplySuccess] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await getTemplates();
      setTemplates(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWeek = async (e) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const weekStart = currentWeekStart instanceof Date
        ? currentWeekStart.toISOString().split('T')[0]
        : currentWeekStart;
      const res = await saveWeekAsTemplate({ weekStart, name: saveName.trim() });
      setTemplates((prev) => [res.data, ...prev]);
      setSaveName('');
      setSaveSuccess('Template saved!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async (templateId) => {
    setApplying(templateId);
    setApplySuccess('');
    try {
      const weekStart = currentWeekStart instanceof Date
        ? currentWeekStart.toISOString().split('T')[0]
        : currentWeekStart;
      await applyTemplate(templateId, weekStart);
      setApplySuccess('Template applied!');
      setTimeout(() => setApplySuccess(''), 3000);
      if (onApplyTemplate) onApplyTemplate(templateId);
    } catch {
    } finally {
      setApplying(null);
    }
  };

  const handleDelete = async (templateId) => {
    setDeletingId(templateId);
    try {
      await deleteTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t._id !== templateId));
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  const wrapperStyle = {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    marginTop: '24px',
  };

  const sectionTitleStyle = {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '14px',
  };

  const dividerStyle = {
    borderTop: '1px solid #E5E7EB',
    margin: '20px 0',
  };

  const inputStyle = {
    flex: 1,
    padding: '9px 14px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  };

  const saveBtnStyle = {
    backgroundColor: saving ? '#9CA3AF' : '#2D6A4F',
    color: '#fff',
    border: 'none',
    padding: '9px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: saving ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const templateRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #F3F4F6',
  };

  const applyBtnStyle = (id) => ({
    backgroundColor: applying === id ? '#9CA3AF' : '#F0FDF4',
    color: applying === id ? '#fff' : '#2D6A4F',
    border: applying === id ? 'none' : '1px solid #BBF7D0',
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: applying === id ? 'not-allowed' : 'pointer',
  });

  const deleteBtnStyle = (id) => ({
    backgroundColor: 'transparent',
    color: deletingId === id ? '#9CA3AF' : '#DC2626',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: deletingId === id ? 'not-allowed' : 'pointer',
  });

  const getDayCount = (days) => {
    if (!days) return 0;
    return days.filter((d) =>
      d.meals?.breakfast || d.meals?.lunch || d.meals?.dinner || (d.meals?.snacks?.length > 0)
    ).length;
  };

  return (
    <div style={wrapperStyle}>
      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2D6A4F', margin: '0 0 20px 0' }}>Meal Plan Templates</h3>

      <div>
        <p style={sectionTitleStyle}>Save Current Week as Template</p>
        {saveError && (
          <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '10px' }}>
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '10px' }}>
            {saveSuccess}
          </div>
        )}
        <form onSubmit={handleSaveWeek} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Template name..."
            maxLength={80}
            style={inputStyle}
            required
          />
          <button type="submit" disabled={saving || !saveName.trim()} style={saveBtnStyle}>
            {saving ? 'Saving...' : 'Save Week'}
          </button>
        </form>
      </div>

      <div style={dividerStyle} />

      <div>
        <p style={sectionTitleStyle}>My Templates</p>

        {applySuccess && (
          <div style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '10px' }}>
            {applySuccess}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '14px' }}>Loading templates...</div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '14px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            No templates yet. Save a week plan to get started!
          </div>
        ) : (
          templates.map((template) => (
            <div key={template._id} style={templateRowStyle}>
              <div>
                <div style={{ fontWeight: '600', color: '#1F2937', fontSize: '14px', marginBottom: '2px' }}>{template.name}</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  {getDayCount(template.days)} {getDayCount(template.days) === 1 ? 'day' : 'days'} planned
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => handleApply(template._id)}
                  disabled={applying === template._id}
                  style={applyBtnStyle(template._id)}
                >
                  {applying === template._id ? 'Applying...' : 'Apply'}
                </button>
                <button
                  onClick={() => handleDelete(template._id)}
                  disabled={deletingId === template._id}
                  style={deleteBtnStyle(template._id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TemplateManager;
