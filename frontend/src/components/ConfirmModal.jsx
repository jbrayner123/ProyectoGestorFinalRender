// src/components/ConfirmModal.jsx
import React from "react";

export default function ConfirmModal({ visible, title, message, onConfirm, onCancel }) {
  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-icon">🚨</div>
          <h3 className="modal-title">{title || "Confirmar acción"}</h3>
        </div>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn-delete" onClick={onConfirm}>
            Sí, eliminar cuenta
          </button>
        </div>
      </div>
    </div>
  );
}