// src/App.jsx
import { Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import Toast from "./components/Toast";
import Login from "./components/Login";
import Register from "./components/Register";
import UserProfile from "./components/UserProfile";
import NotificationBell from "./components/NotificationBell";
import NotificationList from "./components/NotificationList";
import CategoryList from "./components/CategoryList";  // NUEVA LÍNEA

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  function showNotification(message, type = "info") {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 3000);
  }

  function handleCreated() {
    setRefreshKey((k) => k + 1);
  }

  function handleLogin(userData) {
    setUser(userData);
    setIsAuthenticated(true);
    setShowRegister(false);
  }

  function handleRegister(userData) {
    setUser(userData);
    setIsAuthenticated(true);
    setShowRegister(false);
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    setUser(null);
    setIsAuthenticated(false);
    setShowRegister(false);
    showNotification("Sesión cerrada correctamente", "info");
  }

  function handleUserUpdate(updatedUser) {
    setUser(updatedUser);
    showNotification("Perfil actualizado correctamente", "success");
  }

  function handleUserDelete() {
    handleLogout();
    showNotification("Cuenta eliminada correctamente", "info");
  }

  function goToRegister() {
    setShowRegister(true);
  }

  function goToLogin() {
    setShowRegister(false);
  }

  // Si no está autenticado, mostrar login o registro
  if (!isAuthenticated) {
    return (
      <>
        {showRegister ? (
          <Register 
            onRegister={handleRegister} 
            onBackToLogin={goToLogin}
            showNotification={showNotification} 
          />
        ) : (
          <Login 
            onLogin={handleLogin} 
            onGoToRegister={goToRegister}
            showNotification={showNotification} 
          />
        )}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((t) => ({ ...t, visible: false }))}
        />
      </>
    );
  }

  // Si está autenticado, mostrar la aplicación
  return (
    <div className="container">
      {/* Header con información del usuario */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>🗂️ Gestor de Trabajo Personal</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            👋 Hola, {user?.name || user?.email}
          </span>
          <NotificationBell />
          <Link 
            to="/profile" 
            style={{
              padding: '6px 12px',
              background: '#2d8cff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            👤 Perfil
          </Link>
          <button 
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🚪 Salir
          </button>
        </div>
      </div>

      {/* Menú de navegación */}
      <nav style={{ marginBottom: 20, textAlign: "center" }}>
        <Link to="/" style={{ marginRight: 15 }}>📋 Ver Tareas</Link>
        <Link to="/crear" style={{ marginRight: 15 }}>➕ Crear Tarea</Link>
        <Link to="/categories" style={{ marginRight: 15 }}>🏷️ Categorías</Link>  {/* NUEVA LÍNEA */}
        <Link to="/notifications">📬 Notificaciones</Link>
      </nav>

      {/* Rutas */}
      <Routes>
        <Route
          path="/"
          element={<TaskList refreshKey={refreshKey} showNotification={showNotification} />}
        />
        <Route
          path="/crear"
          element={<TaskForm onCreated={handleCreated} showNotification={showNotification} />}
        />
                <Route
          path="/categories"
          element={<CategoryList showNotification={showNotification} refreshKey={refreshKey} />}  
        />
        <Route
          path="/profile"
          element={
            <UserProfile 
              user={user} 
              onUserUpdate={handleUserUpdate} 
              onUserDelete={handleUserDelete}
              showNotification={showNotification} 
            />
          }
        />
        <Route
          path="/notifications"
          element={<NotificationList />}
        />
      </Routes>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  );
}