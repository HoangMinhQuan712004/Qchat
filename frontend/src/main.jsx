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


function AppContent() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [selectedConversation, setSelectedConversation] = useState(null) // now an object or null
  const [showSettings, setShowSettings] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const { addToast } = useToast();

  // Notification state
  const [notification, setNotification] = useState(null);

  function onAuth(tokenVal, userObj) {
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
        setUser(data.user)
        connectSocket(token); // Ensure socket matches token
      })
      .catch(() => {
        // if endpoint not available, try decode token minimally
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setUser({ username: payload.username, displayName: payload.displayName || payload.username, _id: payload.userId || payload.sub })
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
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 'bold' }}>{user?.displayName || user?.username}</div>
              <button className="btn-icon small" style={{ fontSize: 12, width: 'auto', padding: '4px 8px', borderRadius: 4 }} onClick={onLogout}>logout</button>
            </div>
            <Sidebar
              token={token}
              user={user}
              onStartConversation={async (members) => {
                try {
                  const res = await fetch('http://localhost:4000/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ members }) })
                  const data = await res.json();
                  setSelectedConversation(data.conversation)
                } catch (err) { console.error(err) }
              }}
              onAddFriend={(id) => fetch('http://localhost:4000/friends', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ userId: id }) }).then(() => alert('Friend added')).catch(() => { })}
              onSelectConversation={(conv) => setSelectedConversation(conv)}
              onOpenSettings={() => setShowSettings(true)}
              onOpenGroupModal={() => setShowGroupModal(true)}
              onDeleteGroup={async (gid) => {
                try {
                  const res = await fetch(`http://localhost:4000/groups/${gid}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
                  if (res.ok) {
                    addToast('Group deleted successfully', 'success');
                    setSelectedConversation(null);
                    setTimeout(() => window.location.reload(), 1000);
                  } else {
                    const d = await res.json();
                    addToast(d.message || 'Failed to delete group', 'error');
                  }
                } catch (e) {
                  console.error(e);
                  addToast('Error deleting group: ' + e.message, 'error');
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
                    <span style={{ opacity: 0.6, fontSize: '0.8em', marginRight: 8 }}>{selectedConversation.isGroup ? '#' : '@'}</span>
                    {getHeaderTitle()}
                  </h2>
                  <div className="chat-box">
                    <ChatRoom token={token} conversationId={selectedConversation._id} user={user} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

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
    </div>
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
