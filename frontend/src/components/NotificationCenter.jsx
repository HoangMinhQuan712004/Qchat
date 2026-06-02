import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../socketService';
import { API_URL } from '../config';
import { useToast } from './Toast';
import { Bell, Inbox } from 'lucide-react';

export default function NotificationCenter({ token, user, onSelectNotification }) {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const authHeader = { Authorization: 'Bearer ' + token };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, { headers: authHeader });
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (err) { console.error(err); }
  };

  const fetchFriendRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/friends/requests`, { headers: authHeader });
      const data = await res.json();
      if (data.requests) setFriendRequests(data.requests);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!token) return;
    fetchNotifications();
    fetchFriendRequests();
    const s = getSocket();
    if (!s) return;
    const handleNew = ({ notification }) => {
      if (notification) setNotifications(prev => [notification, ...prev]);
      else fetchNotifications();
    };
    const handleFriendRequest = ({ from }) => {
      setFriendRequests(prev => {
        if (prev.some(r => String(r.from?._id || r.from) === String(from._id))) return prev;
        return [{ from, sentAt: new Date() }, ...prev];
      });
      addToast(`${from.displayName || from.username} muon ket ban voi ban!`, 'info', 6000);
    };
    const handleFriendAccepted = ({ by }) => {
      addToast(`${by.displayName || by.username} da chap nhan loi moi ket ban!`, 'success', 5000);
    };
    s.on('message_notification', handleNew);
    s.on('wallet_notification', handleNew);
    s.on('friend_request', handleFriendRequest);
    s.on('friend_accepted', handleFriendAccepted);
    window.addEventListener('conversation_read', fetchNotifications);
    return () => {
      s.off('message_notification', handleNew);
      s.off('wallet_notification', handleNew);
      s.off('friend_request', handleFriendRequest);
      s.off('friend_accepted', handleFriendAccepted);
      window.removeEventListener('conversation_read', fetchNotifications);
    };
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length + friendRequests.length;

  const markAsRead = async (id) => {
    await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT', headers: authHeader });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const acceptRequest = async (fromId) => {
    try {
      await fetch(`${API_URL}/friends/requests/${fromId}/accept`, { method: 'POST', headers: authHeader });
      setFriendRequests(prev => prev.filter(r => String(r.from?._id || r.from) !== String(fromId)));
      addToast('Da chap nhan loi moi ket ban!', 'success');
    } catch { addToast('Co loi xay ra', 'error'); }
  };

  const declineRequest = async (fromId) => {
    try {
      await fetch(`${API_URL}/friends/requests/${fromId}/decline`, { method: 'POST', headers: authHeader });
      setFriendRequests(prev => prev.filter(r => String(r.from?._id || r.from) !== String(fromId)));
      addToast('Da tu choi loi moi', 'info');
    } catch { addToast('Co loi xay ra', 'error'); }
  };

  return (
    <div className="notif-center" ref={containerRef} style={{ position: 'relative' }}>
      <button className="btn-icon" onClick={() => setIsOpen(!isOpen)} style={{ position: 'relative', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isOpen ? 'var(--accent-dim)' : 'transparent', border: isOpen ? '1px solid var(--border-hover)' : '1px solid transparent', color: isOpen ? 'var(--accent)' : 'var(--muted)' }}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--danger)', color: 'white', borderRadius: '50%', fontSize: '10px', minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid var(--bg-panel)' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{ position: 'fixed', top: 60, left: 270, width: 340, maxHeight: '70vh', overflowY: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', zIndex: 9999 }} className="custom-scroll">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--card)', zIndex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Thông báo</span>
            <button onClick={async () => { await fetch(`${API_URL}/notifications/read-all`, { method: 'PUT', headers: authHeader }); fetchNotifications(); }} style={{ fontSize: '0.75rem', background: 'var(--accent-dim)', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Đọc tất cả</button>
          </div>

          {friendRequests.length > 0 && (
            <div>
              <div style={{ padding: '8px 16px 4px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Loi moi ket ban ({friendRequests.length})
              </div>
              {friendRequests.map((req, i) => {
                const from = req.from;
                const fromId = from?._id || from;
                const name = from?.displayName || from?.username || 'Nguoi dung';
                return (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(88,101,242,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #4338ca, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexShrink: 0, fontSize: 15 }}>
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>muon ket ban voi ban</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => acceptRequest(fromId)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Chap nhan</button>
                      <button onClick={() => declineRequest(fromId)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Tu choi</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {notifications.length === 0 && friendRequests.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', opacity: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Inbox size={36} style={{ color: 'var(--muted)' }} />
              <div style={{ fontSize: '0.85rem' }}>Chưa có thông báo</div>
            </div>
          )}
          {notifications.map(n => (
            <div key={n._id} onClick={() => { if (!n.isRead) markAsRead(n._id); if (onSelectNotification) onSelectNotification(n); setIsOpen(false); }} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.isRead ? 'transparent' : 'rgba(88,101,242,0.05)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(88,101,242,0.05)'}>
              <div style={{ fontSize: '0.85rem', fontWeight: n.isRead ? 400 : 600 }}>{n.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>{n.message}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4, opacity: 0.6 }}>{new Date(n.createdAt).toLocaleString('vi-VN')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
