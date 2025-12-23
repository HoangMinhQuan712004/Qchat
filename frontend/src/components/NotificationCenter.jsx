import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../socketService';

export default function NotificationCenter({ token, user, onSelectNotification }) {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const containerRef = useRef(null);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const res = await fetch('http://localhost:4000/notifications', {
                headers: { Authorization: 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.notifications) {
                setNotifications(data.notifications);
                setUnreadCount(data.notifications.filter(n => !n.isRead).length);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    useEffect(() => {
        if (token) fetchNotifications();

        const s = getSocket();
        if (!s) return;

        const handleNew = ({ notification }) => {
            if (notification) {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
            } else {
                fetchNotifications();
            }
        };

        s.on('message_notification', handleNew);
        s.on('wallet_notification', handleNew);

        return () => {
            s.off('message_notification', handleNew);
            s.off('wallet_notification', handleNew);
        };
    }, [token]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        await fetch(`http://localhost:4000/notifications/${id}/read`, {
            method: 'PUT', headers: { Authorization: 'Bearer ' + token }
        });
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleItemClick = (notif) => {
        if (!notif.isRead) markAsRead(notif._id);
        if (onSelectNotification) onSelectNotification(notif);
        setIsOpen(false);
    };

    return (
        <div className="notif-center" ref={containerRef} style={{ position: 'relative' }}>
            <button className="btn-icon" onClick={() => setIsOpen(!isOpen)} style={{
                position: 'relative',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                border: isOpen ? '1px solid var(--accent)' : '1px solid transparent'
            }}>
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: -2, right: -2,
                        background: 'var(--accent)', color: 'white', borderRadius: '50%',
                        fontSize: '10px', minWidth: 18, height: 18, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)', border: '2px solid var(--bg-panel)'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notif-dropdown" style={{
                    position: 'absolute', top: 'calc(100% + 10px)', left: 0,
                    width: 320, maxHeight: 450, overflowY: 'auto',
                    background: 'var(--bg-panel)', border: '1px solid var(--border)',
                    borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 9999, display: 'flex', flexDirection: 'column',
                    animation: 'slideUp 0.2s ease-out'
                }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>
                        <span style={{ fontWeight: 'bold' }}>Notifications</span>
                        <button style={{ fontSize: '0.8em', background: 'rgba(88,101,242,0.1)', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}
                            onClick={async (e) => {
                                e.stopPropagation();
                                await fetch('http://localhost:4000/notifications/read-all', { method: 'PUT', headers: { Authorization: 'Bearer ' + token } });
                                fetchNotifications();
                            }}
                        >
                            Mark all read
                        </button>
                    </div>
                    <div className="custom-scroll" style={{ overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', opacity: 0.6 }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                                <div>No notifications yet</div>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n._id} onClick={() => handleItemClick(n)} style={{
                                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                                    cursor: 'pointer', background: n.isRead ? 'transparent' : 'rgba(88,101,242,0.05)',
                                    transition: 'background 0.2s'
                                }} className="notif-item">
                                    <div style={{ fontSize: '0.9rem', fontWeight: n.isRead ? 400 : 700, color: n.isRead ? 'var(--muted)' : 'var(--text)' }}>{n.title}</div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: 4, lineBreak: 'anywhere' }}>{n.message}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: 6 }}>{new Date(n.createdAt).toLocaleString()}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
