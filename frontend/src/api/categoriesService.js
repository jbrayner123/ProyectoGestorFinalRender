// src/api/categoriesService.js
import api from "../api";

export const categoriesService = {
  // Obtener todas las categorías del usuario
  getAll: async () => {
    const response = await api.get("/categories");
    return response.data;
  },

  // Crear una nueva categoría
  create: async (categoryData) => {
    const response = await api.post("/categories", categoryData);
    return response.data;
  },

  // Obtener una categoría por ID
  getById: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  // Actualizar una categoría
  update: async (id, categoryData) => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  // Eliminar una categoría
  delete: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  // Obtener tareas de una categoría
  getTasks: async (id) => {
    const response = await api.get(`/categories/${id}/tasks`);
    return response.data;
  }
};