const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner' };
const MEAL_COLORS = { breakfast: '#FEF9C3', lunch: '#D1FAE5', dinner: '#E0E7FF' };

const WeeklyCalendar = ({ weekPlan, onAddMeal, onRemoveMeal }) => {
  const getDayMeals = (dayOfWeek) => {
    if (!weekPlan?.days) return {};
    const day = weekPlan.days.find((d) => d.dayOfWeek === (dayOfWeek + 1) % 7 || d.dayOfWeek === dayOfWeek + 1);
    if (!day) {
      const altDay = weekPlan.days.find((d) => {
        const mapped = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
        return d.dayOfWeek === mapped;
      });
      return altDay?.meals || {};
    }
    return day?.meals || {};
  };

  const getDayData = (dayIndex) => {
    if (!weekPlan?.days) return null;
    const dow = dayIndex === 6 ? 0 : dayIndex + 1;
    return weekPlan.days.find((d) => d.dayOfWeek === dow);
  };

  const outerStyle = {
    overflowX: 'auto',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid #E5E7EB',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `120px repeat(7, 1fr)`,
    minWidth: '900px',
  };

  const headerCellStyle = (isWeekend) => ({
    padding: '16px 12px',
    textAlign: 'center',
    borderBottom: '2px solid #E5E7EB',
    borderRight: '1px solid #F3F4F6',
    backgroundColor: isWeekend ? '#F9FAFB' : '#fff',
  });

  const rowLabelStyle = {
    padding: '16px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '2px solid #E5E7EB',
    borderBottom: '1px solid #F3F4F6',
    backgroundColor: '#F9FAFB',
  };

  const cellStyle = (mealType, isWeekend) => ({
    padding: '10px',
    borderBottom: '1px solid #F3F4F6',
    borderRight: '1px solid #F3F4F6',
    minHeight: '90px',
    backgroundColor: isWeekend ? '#FAFAFA' : '#fff',
    position: 'relative',
  });

  const recipeChipStyle = {
    backgroundColor: '#D1FAE5',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#065F46',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '4px',
    wordBreak: 'break-word',
  };

  const addBtnStyle = {
    width: '100%',
    height: '100%',
    minHeight: '70px',
    border: '2px dashed #D1D5DB',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#9CA3AF',
    fontSize: '22px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  };

  const removeBtn = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#10B981',
    fontSize: '14px',
    padding: '0',
    lineHeight: 1,
    flexShrink: 0,
  };

  return (
    <div style={outerStyle}>
      <div style={gridStyle}>
        <div style={{ ...headerCellStyle(false), borderRight: '2px solid #E5E7EB' }}>
          <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600' }}>MEAL</span>
        </div>
        {DAY_NAMES.map((day, i) => {
          const isWeekend = i >= 5;
          return (
            <div key={day} style={headerCellStyle(isWeekend)}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: isWeekend ? '#F4A261' : '#1F2937' }}>{day}</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{DAY_FULL[i]}</div>
            </div>
          );
        })}

        {MEAL_TYPES.map((mealType) => (
          <>
            <div key={`label-${mealType}`} style={{ ...rowLabelStyle, backgroundColor: MEAL_COLORS[mealType] }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textAlign: 'center', writingMode: 'horizontal-tb' }}>{MEAL_LABELS[mealType]}</span>
            </div>
            {DAY_NAMES.map((_, dayIndex) => {
              const isWeekend = dayIndex >= 5;
              const dow = dayIndex === 6 ? 0 : dayIndex + 1;
              const dayData = weekPlan?.days?.find((d) => d.dayOfWeek === dow);
              const meal = dayData?.meals?.[mealType];
              const mealName = meal?.title || null;

              return (
                <div key={`${mealType}-${dayIndex}`} style={cellStyle(mealType, isWeekend)}>
                  {mealName ? (
                    <div style={recipeChipStyle}>
                      <span style={{ flex: 1, lineHeight: '1.3' }}>{mealName}</span>
                      <button
                        style={removeBtn}
                        onClick={() => onRemoveMeal(dow, mealType)}
                        title="Remove"
                      >×</button>
                    </div>
                  ) : (
                    <button
                      style={addBtnStyle}
                      onClick={() => onAddMeal(dow, mealType)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2D6A4F';
                        e.currentTarget.style.color = '#2D6A4F';
                        e.currentTarget.style.backgroundColor = '#F0FDF4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#D1D5DB';
                        e.currentTarget.style.color = '#9CA3AF';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >+</button>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
};

export default WeeklyCalendar;