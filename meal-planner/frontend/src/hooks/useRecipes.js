import { useState, useEffect, useCallback } from 'react';
import { getRecipes } from '../services/api.js';

const useRecipes = (initialFilters = {}) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState(initialFilters);

  const fetchRecipes = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const mergedParams = { ...filters, ...params };
      const response = await getRecipes(mergedParams);
      setRecipes(response.data.recipes);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const refetch = (newFilters) => {
    if (newFilters) {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    } else {
      fetchRecipes();
    }
  };

  return { recipes, loading, error, totalPages, refetch };
};

export default useRecipes;