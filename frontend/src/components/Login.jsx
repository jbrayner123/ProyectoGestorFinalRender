// src/components/Login.jsx
import { useState } from "react";
import "./Login.css";
import api from "../api";

export default function Login({ onLogin, onGoToRegister, showNotification }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      showNotification?.("Por favor completa todos los campos", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      const token = res.data?.access_token;
      const user = res.data?.user;
      if (token) {
        localStorage.setItem("access_token", token);
        showNotification?.("¡Bienvenido! Inicio de sesión exitoso", "success");
        onLogin?.(user);
      } else {
        showNotification?.("Respuesta inválida del servidor", "error");
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data || err.message || "Error de autenticación";
      showNotification?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🗂️</div>
          <h1 className="login-title">Gestor de Trabajo Personal</h1>
          <p className="login-subtitle">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
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
                className="login-input"
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
                placeholder="Contraseña"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                className="login-input"
                autoComplete="current-password"
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

          <button 
            type="submit" 
            disabled={loading}
            className="login-button"
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="demo-credentials">
          <div className="demo-title">
            <strong>📝 EJEMPLO:</strong> 
          </div>
          <div className="demo-item">
            <span className="demo-icon">📧</span>
            <span className="demo-text">usuario1@gmail.com</span>
          </div>
          <div className="demo-item">
            <span className="demo-icon">🔑</span>
            <span className="demo-text">123$zkA3 (ejemplo, reemplaza por un usuario y contraseña real)</span>
          </div>
        </div>

        <div className="login-footer">
          <p className="register-link-container">
            ¿No tienes cuenta?{" "}
            <button 
              type="button"
              onClick={onGoToRegister}
              className="register-link"
              disabled={loading}
            >
              Crear cuenta
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
