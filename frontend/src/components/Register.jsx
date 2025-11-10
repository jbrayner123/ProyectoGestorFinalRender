// src/components/Register.jsx
import { useState } from "react";
import "./Register.css";
import api from "../api";

export default function Register({ onRegister, onBackToLogin, showNotification }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ 
      ...f, 
      [name]: type === "checkbox" ? checked : value 
    }));
  }

  function validateForm() {
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
    if (!form.password) {
      showNotification?.("La contraseña es obligatoria", "error");
      return false;
    }
    if (form.password.length < 6) {
      showNotification?.("La contraseña debe tener al menos 6 caracteres", "error");
      return false;
    }
    if (form.password !== form.confirmPassword) {
      showNotification?.("Las contraseñas no coinciden", "error");
      return false;
    }
    if (!form.acceptTerms) {
      showNotification?.("Debes aceptar los términos y condiciones", "error");
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // enviamos únicamente lo que el backend espera
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
      };
      const res = await api.post("/auth/register", payload);
      const token = res.data?.access_token;
      const user = res.data?.user;
      if (token) {
        localStorage.setItem("access_token", token);
        showNotification?.("¡Registro exitoso! Bienvenido", "success");
        onRegister?.(user);
      } else {
        showNotification?.("Error en la respuesta del servidor", "error");
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data || err.message || "Error de registro";
      showNotification?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="register-icon">📝</div>
          <h1 className="register-title">Crear Nueva Cuenta</h1>
          <p className="register-subtitle">Completa tus datos para comenzar</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="input-group">
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                name="name"
                placeholder="Nombre completo"
                value={form.name}
                onChange={handleChange}
                disabled={loading}
                className="register-input"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
                className="register-input"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Contraseña (mín. 6 caracteres)"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                className="register-input"
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
            <div className="input-wrapper">
              <span className="input-icon">🔐</span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirmar contraseña"
                value={form.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                className="register-input"
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

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={form.acceptTerms}
                onChange={handleChange}
                disabled={loading}
                className="checkbox-input"
              />
              <span className="checkbox-text">
                Acepto los <a href="#" className="terms-link">términos y condiciones</a>
              </span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="register-button"
          >
            {loading ? "Creando cuenta..." : "Crear Cuenta"}
          </button>
        </form>

        <div className="register-footer">
          <p className="back-to-login">
            ¿Ya tienes una cuenta?{" "}
            <button 
              type="button"
              onClick={onBackToLogin}
              className="login-link"
              disabled={loading}
            >
              Iniciar Sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
