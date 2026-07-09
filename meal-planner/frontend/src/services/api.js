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
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/password', data);

export const getRecipes = (params) => api.get('/recipes', { params });
export const getRecipe = (id) => api.get(`/recipes/${id}`);
export const createRecipe = (data) => api.post('/recipes', data);
export const updateRecipe = (id, data) => api.put(`/recipes/${id}`, data);
export const deleteRecipe = (id) => api.delete(`/recipes/${id}`);
export const getMyRecipes = () => api.get('/recipes/user/mine');
export const rateRecipe = (id, value) => api.post(`/recipes/${id}/rate`, { value });
export const toggleFavorite = (id) => api.post(`/recipes/${id}/favorite`);
export const getFavorites = () => api.get('/recipes/user/favorites');
export const duplicateRecipe = (id) => api.post(`/recipes/${id}/duplicate`);

export const getMealPlan = (date) => api.get('/mealplans/week', { params: { date } });
export const updateMealPlan = (data) => api.put('/mealplans/week', data);
export const addMealToDay = (id, data) => api.post(`/mealplans/week/${id}/meal`, data);
export const deleteMealPlan = (id) => api.delete(`/mealplans/week/${id}`);

export const getShoppingList = (weekStart) => api.get('/shopping/generate', { params: { weekStart } });
export const getCustomShoppingItems = (weekStart) => api.get('/shopping/custom', { params: { weekStart } });
export const addCustomShoppingItem = (data) => api.post('/shopping/custom', data);

export const getWeekNutrition = (weekStart) => api.get('/nutrition/week', { params: { weekStart } });
export const getRecipeNutrition = (id) => api.get(`/nutrition/recipe/${id}`);
export const getNutritionTargets = () => api.get('/nutrition/targets');

export const getCollections = () => api.get('/collections');
export const getPublicCollections = (params) => api.get('/collections/public', { params });
export const createCollection = (data) => api.post('/collections', data);
export const getCollection = (id) => api.get(`/collections/${id}`);
export const updateCollection = (id, data) => api.put(`/collections/${id}`, data);
export const deleteCollection = (id) => api.delete(`/collections/${id}`);
export const addToCollection = (id, recipeId) => api.post(`/collections/${id}/recipes`, { recipeId });
export const removeFromCollection = (id, recipeId) => api.delete(`/collections/${id}/recipes/${recipeId}`);

export const getComments = (recipeId, params) => api.get(`/comments/recipe/${recipeId}`, { params });
export const createComment = (recipeId, data) => api.post(`/comments/recipe/${recipeId}`, data);
export const updateComment = (id, data) => api.put(`/comments/${id}`, data);
export const deleteComment = (id) => api.delete(`/comments/${id}`);

export const getTemplates = () => api.get('/templates');
export const createTemplate = (data) => api.post('/templates', data);
export const saveWeekAsTemplate = (data) => api.post('/templates/from-week', data);
export const getTemplate = (id) => api.get(`/templates/${id}`);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);
export const applyTemplate = (id, weekStart) => api.post(`/templates/${id}/apply`, { weekStart });

export default api;
