import { create } from 'zustand';

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export const useStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  login: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
  setUser: (user) => set({ user }),

  recipes: [],
  currentRecipe: null,
  loading: false,
  setRecipes: (recipes) => set({ recipes }),
  setCurrentRecipe: (recipe) => set({ currentRecipe: recipe }),
  setLoading: (loading) => set({ loading }),

  weekPlan: null,
  currentWeek: getWeekStart(new Date()),
  setWeekPlan: (weekPlan) => set({ weekPlan }),
  setCurrentWeek: (date) => set({ currentWeek: date }),

  shoppingItems: {},
  setShoppingItems: (items) => set({ shoppingItems: items }),
}));