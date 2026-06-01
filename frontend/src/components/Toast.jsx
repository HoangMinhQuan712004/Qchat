import React, { createContext, useState, useContext, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const resolveRef = useRef(null);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Promise-based confirm — await showConfirm('...') returns true/false
  const showConfirm = useCallback((message, { title = 'Xác nhận', confirmText = 'Xác nhận', cancelText = 'Hủy', danger = false } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirm({ message, title, confirmText, cancelText, danger });
    });
  }, []);

  function handleConfirm(result) {
    setConfirm(null);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  }

  return (
    <ToastContext.Provider value={{ addToast, showConfirm }}>
      {children}

      {/* Toast container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
            <span className="toast-icon">{ICONS[t.type] || 'ℹ'}</span>
            <span className="toast-message">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => handleConfirm(false)}>
          <div className="modal" style={{ width: 380, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{confirm.title}</h3>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--muted)' }}>{confirm.message}</p>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => handleConfirm(false)}>{confirm.cancelText}</button>
              <button
                className="btn"
                style={confirm.danger ? { background: 'var(--danger)' } : {}}
                onClick={() => handleConfirm(true)}
              >
                {confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
