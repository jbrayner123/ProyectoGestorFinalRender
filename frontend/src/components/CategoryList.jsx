// src/components/CategoryList.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";  // ✅ AGREGADO
import { categoriesService } from "../api/categoriesService";
import CategoryModal from "./CategoryModal";
import ConfirmModal from "./ConfirmModal";
import "./CategoryList.css";

export default function CategoryList({ showNotification, refreshKey }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const navigate = useNavigate();  // ✅ AGREGADO

  useEffect(() => {
    loadCategories();
  }, [refreshKey]);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await categoriesService.getAll();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      showNotification("Error al cargar las categorías", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setEditingCategory(null);
    setShowModal(true);
  }

  function handleEdit(category, e) {
    e.stopPropagation();  // ✅ Evitar que se active el clic de la card
    setEditingCategory(category);
    setShowModal(true);
  }

  async function handleDelete(category, e) {
    e.stopPropagation();  // ✅ Evitar que se active el clic de la card
    setCategoryToDelete(category);
  }

  // Ver tareas de una categoría
  function handleViewTasks(category) {
    // Redirigir a la página de tareas con filtro de categoría
    navigate(`/?category=${category.id}`);
  }

  async function confirmDelete() {
    if (!categoryToDelete) return;

    try {
      await categoriesService.delete(categoryToDelete.id);
      showNotification(`Categoría "${categoryToDelete.name}" eliminada`, "success");
      loadCategories();
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      showNotification("Error al eliminar la categoría", "error");
    } finally {
      setCategoryToDelete(null);
    }
  }

  async function handleSave(categoryData) {
    try {
      if (editingCategory) {
        await categoriesService.update(editingCategory.id, categoryData);
        showNotification("Categoría actualizada correctamente", "success");
      } else {
        await categoriesService.create(categoryData);
        showNotification("Categoría creada correctamente", "success");
      }
      setShowModal(false);
      loadCategories();
    } catch (error) {
      console.error("Error al guardar categoría:", error);
      const errorMessage = error.response?.data?.detail || "Error al guardar la categoría";
      showNotification(errorMessage, "error");
    }
  }

  if (loading) {
    return <div className="loading">Cargando categorías...</div>;
  }

  return (
    <div className="category-list-container">
      <div className="category-header">
        <h2>🏷️ Mis Categorías</h2>
        <button className="btn-create-category" onClick={handleCreate}>
          ➕ Nueva Categoría
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <p>📂 No tienes categorías creadas</p>
          <p className="empty-subtitle">Crea tu primera categoría para organizar tus tareas</p>
        </div>
      ) : (
        <div className="categories-grid">
          {categories.map((category) => (
            <div 
              key={category.id} 
              className="category-card"
              onClick={() => handleViewTasks(category)}  // ✅ AGREGADO
              style={{ cursor: "pointer" }}  // ✅ AGREGADO
            >
              <div className="category-icon" style={{ backgroundColor: category.color }}>
                <span>{category.icon}</span>
              </div>
              <div className="category-info">
                <h3>{category.name}</h3>
                <p className="task-count">
                  {category.task_count} {category.task_count === 1 ? "tarea" : "tareas"}
                </p>
              </div>
              <div className="category-actions">
                <button 
                  className="btn-edit" 
                  onClick={(e) => handleEdit(category, e)}
                  title="Editar categoría"
                >
                  ✏️
                </button>
                <button 
                  className="btn-delete" 
                  onClick={(e) => handleDelete(category, e)}
                  title="Eliminar categoría"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CategoryModal
          category={editingCategory}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {categoryToDelete && (
        <ConfirmModal
          message={`¿Estás seguro de eliminar la categoría "${categoryToDelete.name}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setCategoryToDelete(null)}
        />
      )}
    </div>
  );
}