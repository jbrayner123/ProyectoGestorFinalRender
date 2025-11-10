import { useState, useEffect } from "react";
import api from "../api";
import ConfirmModal from "./ConfirmModal";
import "./UserProfile.css";

export default function UserProfile({ user, onUserUpdate, onUserDelete, showNotification }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    current_password: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Inicializar el formulario cuando el usuario cambia
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        current_password: "",
        password: "",
        confirm_password: "",
      });
    }
  }, [user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function validateForm() {
    // Validación básica de campos requeridos
    if (!form.name.trim()) {
      showNotification?.("El nombre es obligatorio", "error");
      return false;
    }
    if (!form.email.trim()) {
      showNotification?.("El email es obligatorio", "error");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      showNotification?.("El email no tiene un formato válido", "error");
      return false;
    }
    if (!form.current_password) {
      showNotification?.("La contraseña actual es obligatoria para guardar cambios", "error");
      return false;
    }
    if (form.password && form.password.length < 6) {
      showNotification?.("La nueva contraseña debe tener al menos 6 caracteres", "error");
      return false;
    }
    if (form.password !== form.confirm_password) {
      showNotification?.("Las contraseñas no coinciden", "error");
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Preparar payload
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        current_password: form.current_password,
      };
      
      // Solo incluir password si se está cambiando
      if (form.password && form.password.trim().length >= 6) {
        payload.password = form.password.trim();
      }
      
      console.log("📤 Enviando actualización:", payload);
      
      const res = await api.put("/user", payload);
      console.log("✅ Respuesta recibida:", res.data);
      
      // Actualizar el estado global
      onUserUpdate?.(res.data);
      showNotification?.("Perfil actualizado correctamente", "success");
      
      // Limpiar campos de contraseña
      setForm(prev => ({ 
        ...prev, 
        current_password: "", 
        password: "", 
        confirm_password: "" 
      }));
      
    } catch (err) {
      console.error("❌ Error en actualización:", err);
      
      let errorMessage = "Error al actualizar el perfil";
      
      if (err.response?.status === 500) {
        errorMessage = "Error interno del servidor. Por favor, intenta más tarde.";
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data) {
        errorMessage = typeof err.response.data === 'string' 
          ? err.response.data 
          : "Error desconocido";
      }
      
      showNotification?.(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick() {
    if (!form.current_password) {
      showNotification?.("Debes ingresar tu contraseña actual para eliminar la cuenta", "error");
      return;
    }
    setShowDeleteModal(true);
  }

  async function handleDeleteAccount() {
    setLoading(true);
    try {
      await api.delete("/user", {
        data: {
          current_password: form.current_password
        }
      });
      showNotification?.("Cuenta eliminada correctamente", "success");
      onUserDelete?.();
    } catch (err) {
      console.error("Error al eliminar cuenta:", err);
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Error al eliminar la cuenta";
      showNotification?.(msg, "error");
      setLoading(false);
    }
    setShowDeleteModal(false);
  }

  function handleCancelDelete() {
    setShowDeleteModal(false);
  }

  if (!user) {
    return (
      <div className="user-profile-container">
        <div className="user-profile-card">
          <div className="user-profile-header">
            <div className="user-profile-icon">👤</div>
            <h1 className="user-profile-title">Cargando...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="user-profile-card">
        <div className="user-profile-header">
          <div className="user-profile-icon">👤</div>
          <h1 className="user-profile-title">Mi Perfil</h1>
          <p className="user-profile-subtitle">Gestiona tu información personal</p>
        </div>

        <form onSubmit={handleSubmit} className="user-profile-form">
          <div className="input-group">
            <label className="input-label">Nombre completo *</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                name="name"
                placeholder="Tu nombre"
                value={form.name}
                onChange={handleChange}
                disabled={loading}
                className="profile-input"
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Correo electrónico *</label>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input
                type="email"
                name="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
                className="profile-input"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Contraseña actual *</label>
            <div className="input-wrapper">
              <span className="input-icon">🔑</span>
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="current_password"
                placeholder="Ingresa tu contraseña actual"
                value={form.current_password}
                onChange={handleChange}
                disabled={loading}
                className="profile-input"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={loading}
                className="password-toggle"
                tabIndex="-1"
              >
                {showCurrentPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Nueva contraseña (opcional)</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                className="profile-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="password-toggle"
                tabIndex="-1"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Confirmar nueva contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon">🔐</span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password"
                placeholder="Repite la contraseña"
                value={form.confirm_password}
                onChange={handleChange}
                disabled={loading}
                className="profile-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                className="password-toggle"
                tabIndex="-1"
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="profile-actions">
            <button 
              type="submit" 
              disabled={loading || !form.current_password || !form.name || !form.email}
              className="update-button"
            >
              {loading ? "🔄 Guardando..." : "💾 Guardar Cambios"}
            </button>
          </div>
        </form>

        <div className="danger-zone">
          <h3 className="danger-zone-title">🚨 Zona de Peligro</h3>
          <p className="danger-zone-description">
            Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, sé seguro.
          </p>
          <button 
            onClick={handleDeleteClick}
            disabled={loading || !form.current_password}
            className="delete-account-button"
          >
            🗑️ Eliminar Mi Cuenta
          </button>
          <p className="danger-zone-note">
            💡 <strong>Nota:</strong> Necesitas ingresar tu contraseña actual para poder eliminar la cuenta
          </p>
        </div>
      </div>

      {/* Modal de confirmación personalizado */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar Cuenta"
        message={`¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer y se eliminarán todas tus tareas.`}
        onConfirm={handleDeleteAccount}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}