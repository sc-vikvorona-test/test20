const NutritionBar = ({ nutrition }) => {
  if (!nutrition) return null;

  const { calories = 0, protein = 0, carbs = 0, fat = 0 } = nutrition;

  const containerStyle = {
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #F3F4F6',
  };

  const macrosRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  };

  const macroCardStyle = (color) => ({
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    borderTop: `3px solid ${color}`,
  });

  const macroValueStyle = (color) => ({
    fontSize: '22px',
    fontWeight: '800',
    color,
    display: 'block',
  });

  const macroLabelStyle = {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '4px',
  };

  const barContainerStyle = {
    marginBottom: '8px',
  };

  const barLabelRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px',
    fontSize: '13px',
  };

  const barTrackStyle = {
    height: '10px',
    backgroundColor: '#E5E7EB',
    borderRadius: '5px',
    overflow: 'hidden',
  };

  const totalMacroCalories = protein * 4 + carbs * 4 + fat * 9;
  const proteinPct = totalMacroCalories > 0 ? Math.round((protein * 4 / totalMacroCalories) * 100) : 0;
  const carbsPct = totalMacroCalories > 0 ? Math.round((carbs * 4 / totalMacroCalories) * 100) : 0;
  const fatPct = totalMacroCalories > 0 ? Math.round((fat * 9 / totalMacroCalories) * 100) : 0;

  const macros = [
    { label: 'Calories', value: calories, unit: 'kcal', color: '#F97316' },
    { label: 'Protein', value: protein, unit: 'g', color: '#3B82F6' },
    { label: 'Carbs', value: carbs, unit: 'g', color: '#F59E0B' },
    { label: 'Fat', value: fat, unit: 'g', color: '#EF4444' },
  ];

  const bars = [
    { label: 'Protein', value: protein, pct: proteinPct, unit: 'g', color: '#3B82F6' },
    { label: 'Carbs', value: carbs, pct: carbsPct, unit: 'g', color: '#F59E0B' },
    { label: 'Fat', value: fat, pct: fatPct, unit: 'g', color: '#EF4444' },
  ];

  return (
    <div style={containerStyle}>
      <div style={macrosRowStyle}>
        {macros.map((macro) => (
          <div key={macro.label} style={macroCardStyle(macro.color)}>
            <span style={macroValueStyle(macro.color)}>{macro.value}</span>
            <span style={macroLabelStyle}>{macro.unit}</span>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{macro.label}</div>
          </div>
        ))}
      </div>

      {totalMacroCalories > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Macro Distribution</div>
          {bars.map((bar) => (
            <div key={bar.label} style={barContainerStyle}>
              <div style={barLabelRowStyle}>
                <span style={{ color: bar.color, fontWeight: '600' }}>{bar.label}</span>
                <span style={{ color: '#6B7280' }}>{bar.value}{bar.unit} ({bar.pct}%)</span>
              </div>
              <div style={barTrackStyle}>
                <div style={{ height: '100%', width: `${bar.pct}%`, backgroundColor: bar.color, borderRadius: '5px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '4px', marginTop: '16px', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
            {bars.map((bar) => (
              <div key={bar.label} style={{ flex: bar.pct, backgroundColor: bar.color, minWidth: bar.pct > 0 ? '4px' : '0' }} title={`${bar.label}: ${bar.pct}%`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionBar;