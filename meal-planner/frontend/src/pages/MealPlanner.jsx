import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import { getMealPlan, updateMealPlan, getWeekNutrition, getRecipes } from '../services/api.js';
import WeeklyCalendar from '../components/WeeklyCalendar.jsx';
import NutritionBar from '../components/NutritionBar.jsx';
import TemplateManager from '../components/TemplateManager.jsx';

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MealPlanner = () => {
  const navigate = useNavigate();
  const { token, weekPlan, setWeekPlan, currentWeek, setCurrentWeek } = useStore();
  const [loading, setLoading] = useState(false);
  const [nutrition, setNutrition] = useState(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [availableRecipes, setAvailableRecipes] = useState([]);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNutritionReport, setShowNutritionReport] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMealPlan();
    }
  }, [currentWeek, token]);

  const fetchMealPlan = async () => {
    setLoading(true);
    try {
      const dateStr = currentWeek.toISOString().split('T')[0];
      const [planRes, nutrRes] = await Promise.all([
        getMealPlan(dateStr),
        getWeekNutrition(dateStr),
      ]);
      setWeekPlan(planRes.data);
      setNutrition(nutrRes.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeal = (dayOfWeek, mealType) => {
    setPickerTarget({ dayOfWeek, mealType });
    setShowRecipePicker(true);
    fetchAvailableRecipes();
  };

  const fetchAvailableRecipes = async (search = '') => {
    try {
      const params = { limit: 20 };
      if (search) params.q = search;
      const res = await getRecipes(params);
      setAvailableRecipes(res.data.recipes);
    } catch {}
  };

  const handleSelectRecipe = async (recipe) => {
    if (!pickerTarget) return;
    setSaving(true);
    try {
      const weekStartStr = currentWeek.toISOString().split('T')[0];
      let planId = weekPlan?._id;

      if (!planId) {
        const days = Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          meals: { breakfast: null, lunch: null, dinner: null, snacks: [] },
        }));
        const createRes = await updateMealPlan({ weekStart: weekStartStr, days });
        planId = createRes.data._id;
      }

      const updatedDays = weekPlan?.days ? [...weekPlan.days] : Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        meals: { breakfast: null, lunch: null, dinner: null, snacks: [] },
      }));

      const dayIndex = updatedDays.findIndex((d) => d.dayOfWeek === pickerTarget.dayOfWeek);
      if (dayIndex === -1) {
        updatedDays.push({ dayOfWeek: pickerTarget.dayOfWeek, meals: { breakfast: null, lunch: null, dinner: null, snacks: [] } });
        const newDayIndex = updatedDays.length - 1;
        updatedDays[newDayIndex].meals[pickerTarget.mealType] = recipe;
      } else {
        if (pickerTarget.mealType === 'snacks') {
          updatedDays[dayIndex].meals.snacks = [...(updatedDays[dayIndex].meals.snacks || []), recipe];
        } else {
          updatedDays[dayIndex].meals[pickerTarget.mealType] = recipe;
        }
      }

      const saveRes = await updateMealPlan({ weekStart: weekStartStr, days: updatedDays.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        meals: {
          breakfast: d.meals.breakfast?._id || d.meals.breakfast || null,
          lunch: d.meals.lunch?._id || d.meals.lunch || null,
          dinner: d.meals.dinner?._id || d.meals.dinner || null,
          snacks: (d.meals.snacks || []).map((s) => s._id || s),
        },
      })) });

      setWeekPlan(saveRes.data);
      setShowRecipePicker(false);
      setPickerTarget(null);

      const nutrRes = await getWeekNutrition(weekStartStr);
      setNutrition(nutrRes.data);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMeal = async (dayOfWeek, mealType) => {
    if (!weekPlan?._id) return;
    setSaving(true);
    try {
      const weekStartStr = currentWeek.toISOString().split('T')[0];
      const updatedDays = (weekPlan.days || []).map((d) => {
        if (d.dayOfWeek !== dayOfWeek) {
          return {
            dayOfWeek: d.dayOfWeek,
            meals: {
              breakfast: d.meals.breakfast?._id || d.meals.breakfast || null,
              lunch: d.meals.lunch?._id || d.meals.lunch || null,
              dinner: d.meals.dinner?._id || d.meals.dinner || null,
              snacks: (d.meals.snacks || []).map((s) => s._id || s),
            },
          };
        }
        const meals = {
          breakfast: d.meals.breakfast?._id || d.meals.breakfast || null,
          lunch: d.meals.lunch?._id || d.meals.lunch || null,
          dinner: d.meals.dinner?._id || d.meals.dinner || null,
          snacks: (d.meals.snacks || []).map((s) => s._id || s),
        };
        meals[mealType] = null;
        return { dayOfWeek: d.dayOfWeek, meals };
      });

      const saveRes = await updateMealPlan({ weekStart: weekStartStr, days: updatedDays });
      setWeekPlan(saveRes.data);

      const nutrRes = await getWeekNutrition(weekStartStr);
      setNutrition(nutrRes.data);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPreviousWeek = async () => {
    const prevWeekDate = new Date(currentWeek);
    prevWeekDate.setDate(prevWeekDate.getDate() - 7);
    const prevWeekStr = prevWeekDate.toISOString().split('T')[0];
    setSaving(true);
    try {
      const prevRes = await getMealPlan(prevWeekStr);
      if (!prevRes.data || !prevRes.data.days || prevRes.data.days.length === 0) {
        setSaving(false);
        return;
      }
      const weekStartStr = currentWeek.toISOString().split('T')[0];
      const copiedDays = prevRes.data.days.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        meals: {
          breakfast: d.meals.breakfast?._id || d.meals.breakfast || null,
          lunch: d.meals.lunch?._id || d.meals.lunch || null,
          dinner: d.meals.dinner?._id || d.meals.dinner || null,
          snacks: (d.meals.snacks || []).map((s) => s._id || s),
        },
      }));
      const saveRes = await updateMealPlan({ weekStart: weekStartStr, days: copiedDays });
      setWeekPlan(saveRes.data);
      const nutrRes = await getWeekNutrition(weekStartStr);
      setNutrition(nutrRes.data);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = async () => {
    await fetchMealPlan();
  };

  const goToPrevWeek = () => {
    const prev = new Date(currentWeek);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeek(getWeekStart(prev));
  };

  const goToNextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(next.getDate() + 7);
    setCurrentWeek(getWeekStart(next));
  };

  const hasMeals = weekPlan?.days?.some((d) =>
    d.meals.breakfast || d.meals.lunch || d.meals.dinner || (d.meals.snacks?.length > 0)
  );

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 24px',
  };

  const navBtnStyle = {
    backgroundColor: '#fff',
    border: '1px solid #D1D5DB',
    color: '#374151',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  };

  const weekNavStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  };

  const weekLabelStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    minWidth: '220px',
    textAlign: 'center',
  };

  const nutritionSummaryStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    marginBottom: '24px',
  };

  const nutrItemStyle = {
    textAlign: 'center',
  };

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  };

  const pickerStyle = {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '28px',
    width: '100%',
    maxWidth: '540px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  };

  const recipePickerItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  };

  const reportToggleBtnStyle = {
    backgroundColor: showNutritionReport ? '#2D6A4F' : '#fff',
    color: showNutritionReport ? '#FEFAE0' : '#374151',
    border: '1px solid #D1D5DB',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '16px',
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#2D6A4F', margin: '0 0 8px 0' }}>Meal Planner</h1>
          <p style={{ color: '#6B7280', margin: 0 }}>Plan your meals for the week ahead</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            style={{ ...navBtnStyle, backgroundColor: '#FFF7ED', color: '#C2410C', borderColor: '#FED7AA' }}
            onClick={handleCopyPreviousWeek}
            disabled={saving}
          >
            {saving ? 'Saving...' : '📋 Copy Previous Week'}
          </button>
          <button style={{ ...navBtnStyle, backgroundColor: '#2D6A4F', color: '#FEFAE0', borderColor: '#2D6A4F' }} onClick={() => navigate('/shopping')}>View Shopping List →</button>
        </div>
      </div>

      <div style={weekNavStyle}>
        <button style={navBtnStyle} onClick={goToPrevWeek}>← Prev Week</button>
        <span style={weekLabelStyle}>{formatDate(currentWeek)} — {formatDate(new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000))}</span>
        <button style={navBtnStyle} onClick={goToNextWeek}>Next Week →</button>
      </div>

      {nutrition?.weekly && (
        <div style={nutritionSummaryStyle}>
          <div style={nutrItemStyle}>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Weekly Cal</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#F97316' }}>{Math.round(nutrition.weekly.calories)}</div>
          </div>
          <div style={nutrItemStyle}>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Protein</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#3B82F6' }}>{Math.round(nutrition.weekly.protein)}g</div>
          </div>
          <div style={nutrItemStyle}>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Carbs</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#F59E0B' }}>{Math.round(nutrition.weekly.carbs)}g</div>
          </div>
          <div style={nutrItemStyle}>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Fat</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#EF4444' }}>{Math.round(nutrition.weekly.fat)}g</div>
          </div>
          <div style={nutrItemStyle}>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Daily Avg</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#2D6A4F' }}>{Math.round(nutrition.weekly.calories / 7)} kcal</div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', fontSize: '48px' }}>⏳</div>
      ) : !hasMeals ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>📅</div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937', marginBottom: '8px' }}>No meals planned this week</h3>
          <p style={{ color: '#6B7280', marginBottom: '24px', fontSize: '15px' }}>Start building your meal plan by clicking the + buttons below, or copy from last week.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              style={{ backgroundColor: '#2D6A4F', color: '#FEFAE0', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
              onClick={() => navigate('/recipes')}
            >
              Browse Recipes
            </button>
            <button
              style={{ backgroundColor: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
              onClick={handleCopyPreviousWeek}
              disabled={saving}
            >
              Copy Previous Week
            </button>
          </div>
        </div>
      ) : null}

      {!loading && (
        <WeeklyCalendar weekPlan={weekPlan} onAddMeal={handleAddMeal} onRemoveMeal={handleRemoveMeal} />
      )}

      {nutrition?.daily && nutrition.daily.length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <button style={reportToggleBtnStyle} onClick={() => setShowNutritionReport(!showNutritionReport)}>
            {showNutritionReport ? '▼' : '▶'} Weekly Nutrition Report
          </button>

          {showNutritionReport && (
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937', marginBottom: '20px' }}>Daily Nutrition Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {nutrition.daily.map((day) => (
                  <div key={day.dayOfWeek} style={{ backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', color: '#1F2937', fontSize: '15px' }}>{day.dayName}</span>
                      {day.percentOfTarget > 0 && (
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: day.percentOfTarget >= 100 ? '#FEE2E2' : '#D1FAE5',
                          color: day.percentOfTarget >= 100 ? '#DC2626' : '#065F46',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}>
                          {day.percentOfTarget}% of target
                        </span>
                      )}
                    </div>
                    {day.calories > 0 ? (
                      <NutritionBar nutrition={{ calories: day.calories, protein: day.protein, carbs: day.carbs, fat: day.fat }} />
                    ) : (
                      <p style={{ color: '#9CA3AF', fontSize: '13px', textAlign: 'center', padding: '16px 0', margin: 0 }}>No meals planned</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <TemplateManager currentWeekStart={currentWeek} onApplyTemplate={handleApplyTemplate} />

      {showRecipePicker && (
        <div style={overlayStyle} onClick={() => setShowRecipePicker(false)}>
          <div style={pickerStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>
                Add {pickerTarget?.mealType?.charAt(0).toUpperCase() + pickerTarget?.mealType?.slice(1)} Recipe
              </h2>
              <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9CA3AF' }} onClick={() => setShowRecipePicker(false)}>×</button>
            </div>

            <input
              type="text"
              placeholder="Search recipes..."
              value={recipeSearch}
              onChange={(e) => { setRecipeSearch(e.target.value); fetchAvailableRecipes(e.target.value); }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', outline: 'none' }}
            />

            {availableRecipes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍳</div>
                <p>No recipes found. Add some recipes first!</p>
              </div>
            )}

            {availableRecipes.map((recipe) => (
              <div
                key={recipe._id}
                style={recipePickerItemStyle}
                onClick={() => handleSelectRecipe(recipe)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                <div>
                  <div style={{ fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>{recipe.title}</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{recipe.cuisine} · {recipe.prepTime + recipe.cookTime}min · {recipe.nutrition?.calories || 0} kcal</div>
                </div>
                <span style={{ color: '#2D6A4F', fontSize: '20px', fontWeight: '600' }}>+</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanner;
