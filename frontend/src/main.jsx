import React from 'react'
import { createRoot } from 'react-dom/client'
import ChatRoom from './components/ChatRoom'
import Sidebar from './components/Sidebar'

// GroupCreator is now a modal
import CreateGroupModal from './components/GroupCreator'
import ServerColumn from './components/ServerColumn'
import GroupList from './components/GroupList'
import '../src/styles.css'
import AuthPage from './pages/AuthPage'
import Settings from './pages/Settings'
import { useState } from 'react'
import Homepage from './components/Homepage'
import { connectSocket, disconnectSocket, getSocket } from './socketService'
import { ToastProvider, useToast } from './components/Toast'
import MediaGallery from './components/MediaGallery'

function AppContent() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [selectedConversation, setSelectedConversation] = useState(null) // now an object or null
  const [showSettings, setShowSettings] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showChatSettings, setShowChatSettings] = useState(false)

  // New States for Features
  const [showMediaGallery, setShowMediaGallery] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { addToast } = useToast();

  // Notification state
  const [notification, setNotification] = useState(null);

  function onAuth(tokenVal, userObj) {
    if (userObj && userObj.id && !userObj._id) userObj._id = userObj.id;
    localStorage.setItem('token', tokenVal)
    setToken(tokenVal)
    setUser(userObj)
    connectSocket(tokenVal)
  }

  function onLogout() {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
    disconnectSocket()
  }

  // Global socket listener for notifications
  React.useEffect(() => {
    // Request permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (!token || !user) return;
    const s = getSocket();
    if (!s) return;

    const onNewGlobal = ({ message }) => {
      const isMe = message.sender === user._id || message.sender?._id === user._id;
      if (!isMe && message.conversationId !== selectedConversation?._id) {
        const senderName = message.sender?.displayName || message.sender?.username || 'Someone';

        // In-app popup
        setNotification({
          id: Date.now(),
          message: `${senderName}: ${message.text}`,
          sender: senderName
        });
        setTimeout(() => setNotification(null), 3000);

        // Browser Notification
        if (Notification.permission === 'granted' && document.hidden) {
          new Notification(`New Message from ${senderName}`, {
            body: message.text,
            icon: '/vite.svg' // Placeholder icon
          });
        }
      }
    };

    s.on('new_message', onNewGlobal);
    return () => s.off('new_message', onNewGlobal);
  }, [token, user, selectedConversation]);

  // If token exists on load, try fetch current user
  React.useEffect(() => {
    if (!token) return;
    // if user already set (from login) skip
    if (user) return;
    fetch('http://localhost:4000/auth/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => {
        if (!r.ok) throw new Error('no')
        return r.json()
      })
      .then(data => {
        // Normalize user object to always have _id
        const u = data.user;
        if (u && u.id && !u._id) u._id = u.id;
        setUser(u)
        connectSocket(token);
      })
      .catch(() => {
        // if endpoint not available, try decode token minimally
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const userId = payload.userId || payload.sub || payload.id;
          setUser({ username: payload.username, displayName: payload.displayName || payload.username, _id: userId })
          connectSocket(token);
        } catch (e) { }
      })
  }, [token])

  if (!token) {
    return <AuthPage onAuth={onAuth} />
  }

  // Helper to get title from selectedConversation object
  function getHeaderTitle() {
    if (!selectedConversation) return 'Chat';
    if (selectedConversation.isGroup) return selectedConversation.title || 'Group Chat';
    // 1-1
    const other = selectedConversation.members?.find(m => m._id !== user?._id);
    return other?.displayName || other?.username || 'Chat';
  }

  return (
    <div className="app-wrap">
      {/* <ServerColumn /> Removed */}
      <div className="main-area">
        <div className="left-sidebar">
          <div>
            <Sidebar
              token={token}
              user={user}
              onLogout={onLogout}
              selectedConversation={selectedConversation}
              onStartConversation={async (members) => {
                try {
                  const res = await fetch('http://localhost:4000/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ members }) })
                  const data = await res.json();
                  setSelectedConversation(data.conversation)
                } catch (err) { console.error(err) }
              }}
              onSelectConversation={(conv) => setSelectedConversation(conv)}
              onOpenSettings={() => setShowSettings(true)}
              onOpenGroupModal={() => setShowGroupModal(true)}
              onGroupDeleted={(gid) => {
                // Clear selection if needed
                if (selectedConversation && selectedConversation.isGroup) {
                  // Ideally check if this conv belongs to the group, but clearing is safe enough if user just deleted something
                  setSelectedConversation(null);
                }
              }}
            />
          </div>
        </div>


        <div className="content">
          {/* Notification Popup */}
          {notification && (
            <div className="notification-popup">
              <div className="notif-icon">💬</div>
              <div className="notif-content">
                <div className="notif-title">{notification.sender}</div>
                <div className="notif-msg">{notification.message}</div>
              </div>
            </div>
          )}

          {showSettings ? (
            <Settings onClose={() => setShowSettings(false)} user={user} />
          ) : (
            <>
              {/* Removed GroupList as it's redundant */}
              {!selectedConversation ? (
                <Homepage
                  user={user}
                  onStartConversation={() => alert('Select a friend or create a group from the sidebar to start chatting!')}
                  onOpenSettings={() => setShowSettings(true)}
                />
              ) : (
                <>
                  <h2 className="chat-header">
                    {!isSearching ? (
                      <>
                        <span style={{ opacity: 0.6, fontSize: '0.8em', marginRight: 8 }}>{selectedConversation.isGroup ? '#' : '@'}</span>
                        {getHeaderTitle()}
                        <div style={{ marginLeft: 'auto', position: 'relative' }}>
                          <button className="btn-icon" onClick={() => setShowChatSettings(true)}>⚙️</button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 10 }}>
                        <span style={{ fontSize: '1.2rem' }}>🔍</span>
                        <input
                          autoFocus
                          className="search-input"
                          style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}
                          placeholder="Search messages..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                        <button className="btn-icon" onClick={() => { setIsSearching(false); setSearchQuery(''); }}>✕</button>
                      </div>
                    )}
                  </h2>
                  <div className="chat-box">
                    <ChatRoom
                      token={token}
                      conversationId={selectedConversation._id}
                      user={user}
                      searchQuery={searchQuery}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showChatSettings && selectedConversation && (
        <div className="modal-overlay" onClick={() => setShowChatSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 350 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Chat Settings</h3>
              <button className="btn-icon" onClick={() => setShowChatSettings(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 8px' }}>
              <div className="settings-item" onClick={async () => {
                const isMuted = selectedConversation.mutedBy?.includes(user._id);
                await fetch(`http://localhost:4000/conversations/${selectedConversation._id}/mute`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                  body: JSON.stringify({ mute: !isMuted })
                });
                const updated = { ...selectedConversation, mutedBy: isMuted ? selectedConversation.mutedBy.filter(id => id !== user._id) : [...(selectedConversation.mutedBy || []), user._id] };
                setSelectedConversation(updated);
                addToast(isMuted ? 'Notifications Unmuted' : 'Notifications Muted', 'success');
              }}>
                <span style={{ fontSize: '1.2rem', marginRight: 12, width: 24, textAlign: 'center' }}>{selectedConversation.mutedBy?.includes(user._id) ? '🔔' : '🔕'}</span>
                <span style={{ fontWeight: 500 }}>{selectedConversation.mutedBy?.includes(user._id) ? 'Unmute Notifications' : 'Mute Notifications'}</span>
              </div>

              <div className="settings-item" onClick={async () => {
                if (!confirm('Are you sure you want to delete ALL messages in this chat?')) return;
                await fetch(`http://localhost:4000/conversations/${selectedConversation._id}/messages`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
                addToast('Chat history cleared', 'success');
                window.location.reload();
              }}>
                <span style={{ fontSize: '1.2rem', marginRight: 12, width: 24, textAlign: 'center', color: 'var(--danger)' }}>🗑️</span>
                <span style={{ fontWeight: 500, color: 'var(--danger)' }}>Delete All Messages</span>
              </div>

              <div className="settings-item" onClick={() => {
                setIsSearching(true);
                setShowChatSettings(false);
              }}>
                <span style={{ fontSize: '1.2rem', marginRight: 12, width: 24, textAlign: 'center' }}>🔍</span>
                <span style={{ fontWeight: 500 }}>Search Messages</span>
              </div>

              <div className="settings-item" onClick={() => {
                setShowMediaGallery(true);
                setShowChatSettings(false);
              }}>
                <span style={{ fontSize: '1.2rem', marginRight: 12, width: 24, textAlign: 'center' }}>🖼️</span>
                <span style={{ fontWeight: 500 }}>Shared Media</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMediaGallery && selectedConversation && (
        <MediaGallery
          token={token}
          conversationId={selectedConversation._id}
          onClose={() => setShowMediaGallery(false)}
        />
      )}

      {
        showGroupModal && (
          <CreateGroupModal
            token={token}
            onClose={() => setShowGroupModal(false)}
            onCreated={(g) => {
              // alert('Group created: ' + (g.name || 'New Group')) // Notification is better
              setSelectedConversation(g)
            }}
          />
        )
      }
    </div >
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

createRoot(document.getElementById('root')).render(<App />)
