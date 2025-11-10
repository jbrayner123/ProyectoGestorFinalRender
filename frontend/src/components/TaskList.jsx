import { useState, useEffect } from "react";
import api from "../api";
import ConfirmModal from "./ConfirmModal";
import { categoriesService } from "../api/categoriesService";

// Componente selector de categorías
function CategorySelector({ value, onChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await categoriesService.getAll();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <select disabled><option>Cargando categorías...</option></select>;
  }

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
      style={{ width: "100%", padding: "8px", fontSize: "14px" }}
    >
      <option value="">Sin categoría</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.icon} {cat.name}
        </option>
      ))}
    </select>
  );
}

export default function TaskList({ refreshKey, showNotification }) {
  const [tasks, setTasks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    important: '',
    category_id: ''
  });
  
  // Estados para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Estados para vistas especiales
  const [activeView, setActiveView] = useState('normal');
  const [specialTasks, setSpecialTasks] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  // Modal state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteTitle, setDeleteTitle] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  function parseApiError(err) {
    const data = err?.response?.data;
    if (!data) return err?.message || "Error desconocido";
    if (typeof data === "string") return data;
    if (data.detail) {
      if (Array.isArray(data.detail)) return data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
      if (typeof data.detail === "string") return data.detail;
      if (data.detail.msg) return data.detail.msg;
    }
    if (data.message) return data.message;
    return JSON.stringify(data);
  }

  // Función para cargar tareas normales
  async function fetchTasks(page = 1, limit = 10, filters = {}) {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        ...filters
      };
      
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      
      const res = await api.get("/listarTareas", { params });
      
      setTasks(res.data.tasks || []);
      setPagination({
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
        totalPages: res.data.total_pages,
        hasNext: res.data.has_next,
        hasPrev: res.data.has_prev
      });
    } catch (err) {
      showNotification?.(parseApiError(err) || "Error cargando tareas", "error");
    } finally {
      setLoading(false);
    }
  }

  // Función para cargar tareas prioritarias
  const fetchPriorityTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tareas-prioritarias?limit=10");
      setSpecialTasks(res.data);
      setActiveView('priority');
      setActiveCategory(null);
    } catch (err) {
      showNotification?.(parseApiError(err) || "Error cargando tareas prioritarias", "error");
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar tareas próximas a vencer
  const fetchUpcomingTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tareas-proximas-vencer?limit=10&days_threshold=3");
      setSpecialTasks(res.data);
      setActiveView('upcoming');
      setActiveCategory(null);
    } catch (err) {
      showNotification?.(parseApiError(err) || "Error cargando tareas próximas", "error");
    } finally {
      setLoading(false);
    }
  };

  // Función para volver a vista normal
  const showNormalView = () => {
    setActiveView('normal');
    setSpecialTasks([]);
    setActiveCategory(null);
    fetchTasks(1, pagination.limit, filters);
  };

  // Función para cargar información de la categoría
  const loadCategoryInfo = async (categoryId) => {
    try {
      const res = await api.get(`/categories/${categoryId}`);
      setActiveCategory(res.data);
    } catch (err) {
      console.error("Error cargando categoría:", err);
      setActiveCategory(null);
    }
  };

  useEffect(() => {
    if (activeView === 'normal') {
      // Verificar si hay un parámetro category en la URL
      const urlParams = new URLSearchParams(window.location.search);
      const categoryId = urlParams.get('category');
      
      if (categoryId) {
        const newFilters = { ...filters, category_id: categoryId };
        setFilters(newFilters);
        fetchTasks(1, 10, newFilters);
        loadCategoryInfo(categoryId);
      } else {
        setActiveCategory(null);
        fetchTasks(1, 10, filters);
      }
    }
  }, [refreshKey]);

  // Funciones para cambiar de página
  const nextPage = () => {
    if (pagination.hasNext && activeView === 'normal') {
      fetchTasks(pagination.page + 1, pagination.limit, filters);
    }
  };

  const prevPage = () => {
    if (pagination.hasPrev && activeView === 'normal') {
      fetchTasks(pagination.page - 1, pagination.limit, filters);
    }
  };

  // Manejar cambios en los filtros
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Aplicar filtros
  const applyFilters = () => {
    if (activeView === 'normal') {
      fetchTasks(1, pagination.limit, filters);
    }
  };

  // Limpiar filtros
  const clearFilters = () => {
    if (activeView === 'normal') {
      const emptyFilters = {
        q: '',
        status: '',
        important: '',
        category_id: ''
      };
      setFilters(emptyFilters);
      setActiveCategory(null);
      fetchTasks(1, pagination.limit, emptyFilters);
      
      // Limpiar parámetro de la URL
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  function requestDelete(id, title) {
    setDeleteId(id);
    setDeleteTitle(title);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/eliminarTarea/${deleteId}`);
      if (activeView === 'normal') {
        fetchTasks(pagination.page, pagination.limit, filters);
      } else if (activeView === 'priority') {
        fetchPriorityTasks();
      } else if (activeView === 'upcoming') {
        fetchUpcomingTasks();
      }
      showNotification?.("Tarea eliminada", "success");
    } catch (err) {
      showNotification?.(parseApiError(err) || "Error al eliminar", "error");
    } finally {
      setDeleteId(null);
      setDeleteTitle("");
    }
  }

  function cancelDelete() {
    setDeleteId(null);
    setDeleteTitle("");
  }

  function isPastDate(dateStr) {
    if (!dateStr) return false;
    const due = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  async function handleUpdate(id) {
    if (editForm.due_date && isPastDate(editForm.due_date)) {
      showNotification?.("Fecha no válida: la fecha ya pasó", "error");
      return;
    }

    try {
      // Asegurarnos de que cuando is_completed sea true, el status sea "completed"
      if (editForm.is_completed) {
        editForm.status = "completed";
      } else if (!editForm.is_completed && editForm.status === "completed") {
        editForm.status = "pending";
      }

      const res = await api.put(`/editarTarea/${id}`, editForm);
      
      if (activeView === 'normal') {
        setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
      } else {
        setSpecialTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
      }
      
      setEditingId(null);
      showNotification?.("Tarea actualizada", "success");
    } catch (err) {
      showNotification?.(parseApiError(err) || "Error al actualizar", "error");
    }
  }

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  // Obtener título según la vista activa
  const getViewTitle = () => {
    if (activeCategory) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            backgroundColor: activeCategory.color,
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            {activeCategory.icon}
          </span>
          <span>{activeCategory.name} ({pagination.total} {pagination.total === 1 ? 'tarea' : 'tareas'})</span>
        </div>
      );
    }
    
    switch (activeView) {
      case 'priority':
        return '🚨 Tareas Prioritarias';
      case 'upcoming':
        return '⏰ Tareas Próximas a Vencer';
      default:
        return '📋 Mis Tareas';
    }
  };

  // Obtener las tareas a mostrar según la vista activa
  const getTasksToShow = () => {
    return activeView === 'normal' ? tasks : specialTasks;
  };

  return (
    <div>
      <h2>{getViewTitle()}</h2>
      
      {/* Botones para cambiar vista */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => {
            setActiveView('normal');
            setActiveCategory(null);
            const emptyFilters = { q: '', status: '', important: '', category_id: '' };
            setFilters(emptyFilters);
            fetchTasks(1, pagination.limit, emptyFilters);
            window.history.pushState({}, '', window.location.pathname);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: activeView === 'normal' && !activeCategory ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          📋 Todas las Tareas
        </button>

        {activeCategory && (
          <button 
            onClick={() => {
              setActiveCategory(null);
              const newFilters = { ...filters, category_id: '' };
              setFilters(newFilters);
              fetchTasks(1, pagination.limit, newFilters);
              window.history.pushState({}, '', window.location.pathname);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✖ Quitar filtro de categoría
          </button>
        )}

        <button 
          onClick={fetchPriorityTasks}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: activeView === 'priority' ? '#e74c3c' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          🚨 Tareas Prioritarias
        </button>

        <button 
          onClick={fetchUpcomingTasks}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: activeView === 'upcoming' ? '#f39c12' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          ⏰ Próximas a Vencer
        </button>

        {activeView === 'normal' && (
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showFilters ? '⬆️ Ocultar Filtros' : '⬇️ Mostrar Filtros'}
          </button>
        )}
      </div>

      {/* Panel de Filtros (solo en vista normal) */}
      {showFilters && activeView === 'normal' && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>🔍 Filtros</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Buscar:</label>
              <input
                type="text"
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                placeholder="Título o descripción"
                style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Estado:</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="">Todos</option>
                <option value="pending">pending</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Importancia:</label>
              <select
                value={filters.important}
                onChange={(e) => handleFilterChange('important', e.target.value)}
                style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="">Todas</option>
                <option value="true">Importantes</option>
                <option value="false">No importantes</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={applyFilters}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✅ Aplicar Filtros
            </button>
            <button 
              onClick={clearFilters}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🗑️ Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Información de paginación (solo en vista normal) */}
      {activeView === 'normal' && (
        <div style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          <span>
            Mostrando {tasks.length} de {pagination.total} tareas
            {pagination.totalPages > 1 && ` (Página ${pagination.page} de ${pagination.totalPages})`}
          </span>
        </div>
      )}

      {loading && <p>Cargando...</p>}
      {!loading && getTasksToShow().length === 0 && <p>No hay tareas que coincidan con los filtros</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {getTasksToShow().map((t) => (
          <li key={t.id} className="task-item">
            {editingId === t.id ? (
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
                <textarea
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                
                {/* Selector de categoría */}
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "14px" }}>
                    Categoría:
                  </label>
                  <CategorySelector 
                    value={editForm.category_id || ""} 
                    onChange={(categoryId) => setEditForm({ ...editForm, category_id: categoryId })}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: 8 }}>
                  <input
                    type="date"
                    value={editForm.due_date || ""}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  />
                  <input
                    type="time"
                    value={editForm.due_time || ""}
                    onChange={(e) => setEditForm({ ...editForm, due_time: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: 8, alignItems: "center" }}>
                  <select
                    value={editForm.priority || "medium"}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>

                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="checkbox"
                      checked={!!editForm.important}
                      onChange={(e) => setEditForm({ ...editForm, important: e.target.checked })}
                    />
                    Importante
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="checkbox"
                      checked={!!editForm.is_completed}
                      onChange={(e) => {
                        const isCompleted = e.target.checked;
                        setEditForm({ 
                          ...editForm, 
                          is_completed: isCompleted,
                          status: isCompleted ? "completed" : "pending"
                        });
                      }}
                    />
                    Tarea completada
                  </label>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button className="btn-edit" onClick={() => handleUpdate(t.id)}>Guardar</button>
                  <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <strong>{t.title}</strong>
                  <p style={{ margin: "6px 0" }}>{t.description}</p>
                  <small>
                    📅 {formatDate(t.due_date)} ⏰ {t.due_time || "-"} <br />
                    🔥 Prioridad: {t.priority} | 
                    {t.is_completed ? "✅ completed" : "⏳ pending"} <br />
                    {t.important ? "⭐ Importante" : "Normal"} | 
                    Estado: {t.status} <br />
                    Creada: {formatDate(t.created_at)}
                    {t.completed_at && ` | Completada: ${formatDate(t.completed_at)}`}
                  </small>
                </div>

                <div className="task-actions">
                  <button
                    className="btn-edit"
                    onClick={() => {
                      setEditingId(t.id);
                      setEditForm({ ...t });
                    }}
                    title="Editar tarea"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => requestDelete(t.id, t.title)}
                    title="Eliminar tarea"
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Controles de paginación (solo en vista normal) */}
      {activeView === 'normal' && pagination.totalPages > 1 && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          gap: "16px", 
          marginTop: "20px",
          padding: "10px",
          borderTop: "1px solid #eee"
        }}>
          <button 
            onClick={prevPage} 
            disabled={!pagination.hasPrev}
            style={{
              padding: "8px 16px",
              border: "1px solid #ddd",
              background: pagination.hasPrev ? "white" : "#f5f5f5",
              color: pagination.hasPrev ? "#333" : "#999",
              borderRadius: "4px",
              cursor: pagination.hasPrev ? "pointer" : "not-allowed"
            }}
          >
            ← Anterior
          </button>
          
          <span style={{ fontSize: "14px", color: "#666" }}>
            Página {pagination.page} de {pagination.totalPages}
          </span>
          
          <button 
            onClick={nextPage} 
            disabled={!pagination.hasNext}
            style={{
              padding: "8px 16px",
              border: "1px solid #ddd",
              background: pagination.hasNext ? "white" : "#f5f5f5",
              color: pagination.hasNext ? "#333" : "#999",
              borderRadius: "4px",
              cursor: pagination.hasNext ? "pointer" : "not-allowed"
            }}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Modal de confirmación */}
      <ConfirmModal
        visible={!!deleteId}
        title="Eliminar tarea"
        message={`¿Quieres eliminar la tarea "${deleteTitle}"?`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}