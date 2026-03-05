const DAILY_TARGETS = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 78,
};

const NutritionBar = ({ nutrition }) => {
  if (!nutrition) return null;

  const { calories = 0, protein = 0, carbs = 0, fat = 0 } = nutrition;

  const calPct = Math.min(100, Math.round((calories / DAILY_TARGETS.calories) * 100));
  const proteinPct = Math.min(100, Math.round((protein / DAILY_TARGETS.protein) * 100));
  const carbsPct = Math.min(100, Math.round((carbs / DAILY_TARGETS.carbs) * 100));
  const fatPct = Math.min(100, Math.round((fat / DAILY_TARGETS.fat) * 100));

  const caloriesRemaining = DAILY_TARGETS.calories - calories;
  const isOverCalories = calories > DAILY_TARGETS.calories;

  const containerStyle = {
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #F3F4F6',
  };

  const macrosRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '24px',
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

  const macroGoalStyle = {
    fontSize: '11px',
    color: '#9CA3AF',
    marginTop: '2px',
  };

  const macroLabelStyle = {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '4px',
  };

  const barContainerStyle = {
    marginBottom: '12px',
  };

  const barLabelRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px',
    fontSize: '13px',
    alignItems: 'center',
  };

  const barTrackStyle = {
    height: '10px',
    backgroundColor: '#E5E7EB',
    borderRadius: '5px',
    overflow: 'hidden',
  };

  const getBarColor = (pct, color) => {
    if (pct >= 100) return '#EF4444';
    if (pct >= 80) return '#F59E0B';
    return color;
  };

  const totalMacroCalories = protein * 4 + carbs * 4 + fat * 9;
  const macroProteinPct = totalMacroCalories > 0 ? Math.round((protein * 4 / totalMacroCalories) * 100) : 0;
  const macroCarbsPct = totalMacroCalories > 0 ? Math.round((carbs * 4 / totalMacroCalories) * 100) : 0;
  const macroFatPct = totalMacroCalories > 0 ? Math.round((fat * 9 / totalMacroCalories) * 100) : 0;

  const macros = [
    { label: 'Calories', value: calories, unit: 'kcal', color: '#F97316', goal: DAILY_TARGETS.calories, pct: calPct },
    { label: 'Protein', value: protein, unit: 'g', color: '#3B82F6', goal: DAILY_TARGETS.protein, pct: proteinPct },
    { label: 'Carbs', value: carbs, unit: 'g', color: '#F59E0B', goal: DAILY_TARGETS.carbs, pct: carbsPct },
    { label: 'Fat', value: fat, unit: 'g', color: '#EF4444', goal: DAILY_TARGETS.fat, pct: fatPct },
  ];

  const bars = [
    { label: 'Protein', value: protein, pct: macroProteinPct, unit: 'g', color: '#3B82F6', goalPct: proteinPct },
    { label: 'Carbs', value: carbs, pct: macroCarbsPct, unit: 'g', color: '#F59E0B', goalPct: carbsPct },
    { label: 'Fat', value: fat, pct: macroFatPct, unit: 'g', color: '#EF4444', goalPct: fatPct },
  ];

  return (
    <div style={containerStyle}>
      <div style={macrosRowStyle}>
        {macros.map((macro) => (
          <div key={macro.label} style={macroCardStyle(macro.color)}>
            <span style={macroValueStyle(macro.color)}>{macro.value}</span>
            <div style={macroGoalStyle}>/ {macro.goal} {macro.unit}</div>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: macro.pct >= 100 ? '#EF4444' : '#22C55E',
              marginTop: '2px',
            }}>
              {macro.pct}%
            </div>
            <div style={macroLabelStyle}>{macro.label}</div>
          </div>
        ))}
      </div>

      <div style={{
        backgroundColor: isOverCalories ? '#FEF2F2' : '#F0FDF4',
        border: `1px solid ${isOverCalories ? '#FECACA' : '#BBF7D0'}`,
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '20px' }}>{isOverCalories ? '⚠️' : '✅'}</span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: isOverCalories ? '#DC2626' : '#16A34A' }}>
          {isOverCalories
            ? `${Math.abs(caloriesRemaining)} calories over daily target`
            : `${caloriesRemaining} calories remaining today`}
        </span>
      </div>

      {totalMacroCalories > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Progress vs Daily Goal</div>
          {bars.map((bar) => (
            <div key={bar.label} style={barContainerStyle}>
              <div style={barLabelRowStyle}>
                <span style={{ color: bar.color, fontWeight: '600' }}>{bar.label}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280' }}>{bar.value}{bar.unit}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: bar.goalPct >= 100 ? '#EF4444' : '#9CA3AF',
                    backgroundColor: bar.goalPct >= 100 ? '#FEF2F2' : '#F3F4F6',
                    padding: '1px 6px',
                    borderRadius: '8px',
                  }}>
                    {bar.goalPct}%
                  </span>
                </div>
              </div>
              <div style={barTrackStyle}>
                <div style={{
                  height: '100%',
                  width: `${bar.pct}%`,
                  backgroundColor: getBarColor(bar.goalPct, bar.color),
                  borderRadius: '5px',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '4px', marginTop: '16px', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
            {bars.map((bar) => (
              <div key={bar.label} style={{ flex: bar.pct, backgroundColor: bar.color, minWidth: bar.pct > 0 ? '4px' : '0' }} title={`${bar.label}: ${bar.pct}%`} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            {bars.map((bar) => (
              <span key={bar.label} style={{ fontSize: '11px', color: bar.color, fontWeight: '600' }}>{bar.label} {bar.pct}%</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionBar;
