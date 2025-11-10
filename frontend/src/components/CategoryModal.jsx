// src/components/CategoryModal.jsx
import { useState, useEffect } from "react";
import "./CategoryModal.css";

const DEFAULT_COLORS = [
  "#3B82F6", // Azul
  "#10B981", // Verde
  "#F59E0B", // Amarillo
  "#EF4444", // Rojo
  "#8B5CF6", // Púrpura
  "#EC4899", // Rosa
  "#14B8A6", // Turquesa
  "#F97316", // Naranja
  "#6366F1", // Índigo
  "#06B6D4", // Cian
];

const DEFAULT_ICONS = [
  "📁", "💼", "🏠", "📚", "❤️", "⚽", "🎨", "🎵", 
  "🍔", "✈️", "💰", "🎯", "🔧", "📱", "🎮", "🚗"
];

export default function CategoryModal({ category, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    color: "#3B82F6",
    icon: "📁"
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        color: category.color || "#3B82F6",
        icon: category.icon || "📁"
      });
    }
  }, [category]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  }

  function handleColorSelect(color) {
    setFormData(prev => ({ ...prev, color }));
  }

  function handleIconSelect(icon) {
    setFormData(prev => ({ ...prev, icon }));
  }

  function validate() {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    } else if (formData.name.length > 100) {
      newErrors.name = "El nombre no puede exceder 100 caracteres";
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
      newErrors.color = "Color inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    onSave(formData);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content category-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{category ? "✏️ Editar Categoría" : "➕ Nueva Categoría"}</h2>
          <button className="btn-close" onClick={onClose}>✖</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Trabajo, Personal, Estudios..."
              maxLength={100}
              className={errors.name ? "error" : ""}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? "selected" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
            <input
              type="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="color-input-custom"
            />
          </div>

          <div className="form-group">
            <label>Ícono</label>
            <div className="icon-picker">
              {DEFAULT_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-option ${formData.icon === icon ? "selected" : ""}`}
                  onClick={() => handleIconSelect(icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
            <input
              type="text"
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              placeholder="O escribe tu propio emoji"
              maxLength={50}
              className="icon-input-custom"
            />
          </div>

          <div className="preview-section">
            <label>Vista previa:</label>
            <div className="category-preview">
              <div className="preview-icon" style={{ backgroundColor: formData.color }}>
                <span>{formData.icon}</span>
              </div>
              <span className="preview-name">{formData.name || "Nombre de categoría"}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {category ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}