// src/components/Toast.jsx
import React from "react";

/**
 * Toast simple.
 * Props:
 *  - visible: boolean
 *  - message: string
 *  - type: 'success' | 'error' | 'info'
 *  - onClose: fn
 */
export default function Toast({ visible, message, type = "info", onClose }) {
  if (!visible) return null;

  const className = `toast ${type === "error" ? "toast-error" : type === "success" ? "toast-success" : "toast-info"}`;

  return (
    <div className={className} role="status" aria-live="polite">
      <div className="toast-content">
        <strong>{type === "error" ? "Error" : type === "success" ? "OK" : "Info"}</strong>
        <span style={{ marginLeft: 8 }}>{message}</span>
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Cerrar">✕</button>
    </div>
  );
}
