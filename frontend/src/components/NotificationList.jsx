import { useState, useEffect } from "react";
import api from "../api";
import ConfirmModal from "./ConfirmModal";
import "./NotificationList.css";

export default function NotificationList() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, message: "" });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (pageNum = 1) => {
    try {
      setLoading(true);
      const res = await api.get(`/notifications?page=${pageNum}&limit=20`);
      
      if (pageNum === 1) {
        setNotifications(res.data.notifications);
      } else {
        setNotifications(prev => [...prev, ...res.data.notifications]);
      }
      
      setTotalUnread(res.data.unread_count);
      setHasMore(res.data.notifications.length === 20);
      setPage(pageNum);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setTotalUnread(prev => prev - 1);
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setTotalUnread(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setDeleteModal({ show: false, id: null, message: "" });
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const confirmDelete = (notificationId, message) => {
    setDeleteModal({
      show: true,
      id: notificationId,
      message: `¿Eliminar la notificación "${message}"?`
    });
  };

  const formatDate = (createdAt) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1);
    }
  };

  return (
    <div className="notification-list-page">
      <div className="notification-header">
        <h1>📬 Notificaciones</h1>
        <div className="notification-stats">
          <span className="unread-count">{totalUnread} sin leer</span>
          {totalUnread > 0 && (
            <button 
              className="mark-all-read-btn"
              onClick={markAllAsRead}
              disabled={loading}
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      <div className="notifications-container">
        {notifications.length === 0 && !loading ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No hay notificaciones</h3>
            <p>Las notificaciones sobre tus tareas aparecerán aquí.</p>
          </div>
        ) : (
          <>
            <div className="notifications-list">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-card ${notification.is_read ? 'read' : 'unread'}`}
                >
                  <div 
                    className="notification-content"
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-details">
                      <span className="task-title">
                        Tarea: {notification.task_title}
                      </span>
                      <span className="notification-date">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="notification-actions">
                    {!notification.is_read && (
                      <button
                        className="btn-mark-read"
                        onClick={() => markAsRead(notification.id)}
                        title="Marcar como leída"
                      >
                        ✅
                      </button>
                    )}
                    <button
                      className="btn-delete"
                      onClick={() => confirmDelete(notification.id, notification.message)}
                      title="Eliminar notificación"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="load-more-container">
                <button 
                  className="load-more-btn"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? "Cargando..." : "Cargar más notificaciones"}
                </button>
              </div>
            )}
          </>
        )}

        {loading && notifications.length === 0 && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando notificaciones...</p>
          </div>
        )}
      </div>

      <ConfirmModal
        visible={deleteModal.show}
        title="Eliminar Notificación"
        message={deleteModal.message}
        onConfirm={() => deleteNotification(deleteModal.id)}
        onCancel={() => setDeleteModal({ show: false, id: null, message: "" })}
      />
    </div>
  );
}