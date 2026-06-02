import React from 'react'
import { API_URL } from '../config'
import { X, MessageSquare } from 'lucide-react'

export default function ProfileCard({ user, onClose, onMessage }) {
  if (!user) return null;

  const initials = (user.displayName || user.username || 'U').slice(0, 1).toUpperCase();
  const name = user.displayName || user.username;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ width: 300, padding: 0, overflow: 'hidden' }}
      >
        {/* Banner + Avatar */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #818cf8 100%)',
          height: 80,
          position: 'relative',
        }}>
          <button
            className="btn-icon"
            onClick={onClose}
            style={{ position: 'absolute', top: 8, right: 8, color: 'white', opacity: 0.9 }}
          >
            <X size={16} />
          </button>
          <div style={{
            position: 'absolute',
            bottom: -28,
            left: 20,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--bg-panel)',
            border: '3px solid var(--bg-panel)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--accent)',
          }}>
            {user.avatarUrl
              ? <img src={`${API_URL}${user.avatarUrl}`} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          {user.isOnline && (
            <div style={{
              position: 'absolute',
              bottom: -20,
              left: 62,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--success)',
              border: '2px solid var(--bg-panel)',
            }} />
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '36px 20px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>@{user.username}</div>
          {user.bio && (
            <div style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.4, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              {user.bio}
            </div>
          )}
          <div style={{ marginTop: 4, fontSize: '0.8rem', color: user.isOnline ? 'var(--success)' : 'var(--muted)' }}>
            {user.isOnline ? '● Online' : '○ Offline'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1, gap: 8 }} onClick={onMessage}>
            <MessageSquare size={16} /> Nhắn tin
          </button>
        </div>
      </div>
    </div>
  )
}
