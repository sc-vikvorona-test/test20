import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);
export const getMe = () => api.get('/auth/me');

export const getRecipes = (params) => api.get('/recipes', { params });
export const getRecipe = (id) => api.get(`/recipes/${id}`);
export const createRecipe = (data) => api.post('/recipes', data);
export const updateRecipe = (id, data) => api.put(`/recipes/${id}`, data);
export const deleteRecipe = (id) => api.delete(`/recipes/${id}`);
export const getMyRecipes = () => api.get('/recipes/user/mine');

export const getMealPlan = (date) => api.get('/mealplans/week', { params: { date } });
export const updateMealPlan = (data) => api.put('/mealplans/week', data);
export const addMealToDay = (id, data) => api.post(`/mealplans/week/${id}/meal`, data);
export const deleteMealPlan = (id) => api.delete(`/mealplans/week/${id}`);

export const getShoppingList = (weekStart) => api.get('/shopping/generate', { params: { weekStart } });

export const getWeekNutrition = (weekStart) => api.get('/nutrition/week', { params: { weekStart } });
export const getRecipeNutrition = (id) => api.get(`/nutrition/recipe/${id}`);

export default api;