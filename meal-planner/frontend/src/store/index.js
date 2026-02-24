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
    set({ user: null, token: null, favorites: [] });
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

  favorites: [],
  setFavorites: (favorites) => set({ favorites }),
  toggleFavoriteLocal: (recipeId) =>
    set((state) => {
      const isFav = state.favorites.includes(recipeId);
      return {
        favorites: isFav
          ? state.favorites.filter((id) => id !== recipeId)
          : [...state.favorites, recipeId],
      };
    }),

  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, { id: Date.now(), ...notification }],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
