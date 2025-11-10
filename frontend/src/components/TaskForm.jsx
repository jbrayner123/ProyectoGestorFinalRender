// src/components/TaskForm.jsx
import { useState, useEffect } from "react";
import api from "../api";
import { categoriesService } from "../api/categoriesService";

export default function TaskForm({ onCreated, showNotification }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    due_time: "",
    priority: "medium",
    important: false,
    user_id: 1,
    is_completed: false,
    category_id: null,
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const data = await categoriesService.getAll();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function isPastDate(dateStr) {
    if (!dateStr) return false;
    const due = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

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

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.due_date && isPastDate(form.due_date)) {
      showNotification?.("Fecha no válida: la fecha ya pasó", "error");
      return;
    }

    if (!form.title || !form.title.trim()) {
      showNotification?.("El título es obligatorio", "error");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...form,
        category_id: form.category_id && form.category_id !== "" ? parseInt(form.category_id) : null
      };
      
      console.log("Enviando payload:", payload); // Para debug
      
      const res = await api.post("/crearTarea", payload);
      showNotification?.("Tarea creada correctamente", "success");
      onCreated?.(res.data);
      setForm({
        title: "",
        description: "",
        due_date: "",
        due_time: "",
        priority: "medium",
        important: false,
        user_id: 1,
        is_completed: false,
        category_id: null,
      });
    } catch (err) {
      const message = parseApiError(err);
      showNotification?.(message || "Error al crear la tarea", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h3>➕ Nueva Tarea</h3>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>
          Título *
        </label>
        <input
          type="text"
          name="title"
          placeholder="Título de la tarea"
          value={form.title}
          onChange={handleChange}
          required
          style={{ width: "100%", padding: "10px", fontSize: "14px" }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>
          Descripción
        </label>
        <textarea
          name="description"
          placeholder="Descripción (opcional)"
          value={form.description}
          onChange={handleChange}
          rows={3}
          style={{ width: "100%", padding: "10px", fontSize: "14px" }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>
          Categoría
        </label>
        <select
          name="category_id"
          value={form.category_id || ""}
          onChange={handleChange}
          style={{ width: "100%", padding: "10px", fontSize: "14px" }}
        >
          <option value="">Sin categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>
            Fecha de vencimiento
          </label>
          <input
            type="date"
            name="due_date"
            value={form.due_date}
            onChange={handleChange}
            style={{ width: "100%", padding: "10px", fontSize: "14px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>
            Hora
          </label>
          <input
            type="time"
            name="due_time"
            value={form.due_time}
            onChange={handleChange}
            style={{ width: "100%", padding: "10px", fontSize: "14px" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px" }}>
          Prioridad
        </label>
        <select
          name="priority"
          value={form.priority}
          onChange={handleChange}
          style={{ width: "100%", padding: "10px", fontSize: "14px" }}
        >
          <option value="low">🟢 Baja</option>
          <option value="medium">🟡 Media</option>
          <option value="high">🟠 Alta</option>
          <option value="urgent">🔴 Urgente</option>
        </select>
      </div>

      <div style={{ 
        marginBottom: "20px", 
        padding: "15px", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "8px",
        border: "1px solid #dee2e6"
      }}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "10px",
            cursor: "pointer",
            fontSize: "14px"
          }}>
            <input
              type="checkbox"
              name="important"
              checked={form.important}
              onChange={handleChange}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
            <span>⭐ Marcar como importante</span>
          </label>
        </div>

        <div>
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "10px",
            cursor: "pointer",
            fontSize: "14px"
          }}>
            <input
              type="checkbox"
              name="is_completed"
              checked={form.is_completed}
              onChange={handleChange}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
            <span>✅ Tarea completada</span>
          </label>
        </div>
      </div>

      <button 
        type="submit" 
        className="btn-create" 
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px",
          fontSize: "16px",
          fontWeight: "bold",
          backgroundColor: loading ? "#ccc" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Guardando..." : "✅ Crear Tarea"}
      </button>
    </form>
  );
}