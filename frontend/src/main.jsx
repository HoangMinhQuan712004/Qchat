import React from 'react'
import { createRoot } from 'react-dom/client'
import { API_URL } from './config'
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
import NewsWidget from './components/NewsWidget'
import { IconArrowLeft, IconSearch, IconX, IconHash, IconUsers, IconPhone, IconVideo } from './components/QIcons'
import GroupInfoPanel from './components/GroupInfoPanel'
import CallModal from './components/CallModal'

function AppContent() {
  const [token, setToken] = useState(() => {
    // Handle Google OAuth callback: ?token=xxx&user=xxx
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, '', window.location.pathname);
      return urlToken;
    }
    return localStorage.getItem('token') || '';
  })
  const [user, setUser] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlUser = params.get('user');
    if (urlUser) {
      try {
        const u = JSON.parse(decodeURIComponent(urlUser));
        if (u && u.id && !u._id) u._id = u.id;
        return u;
      } catch (e) { return null; }
    }
    return null;
  })
  const [selectedConversation, setSelectedConversation] = useState(null) // now an object or null
  const [showSettings, setShowSettings] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showChatSettings, setShowChatSettings] = useState(false)

  // New States for Features
  const [showMediaGallery, setShowMediaGallery] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [incomingCall, setIncomingCall] = useState(null)
  const callModalRef = React.useRef(null)

  const { addToast, showConfirm } = useToast();

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
        // We handle this via `message_notification` event now for toast consistency, 
        // but if we want to keep the in-app popup logic here we can.
        // For now, let's keep the browser notification part if needed, 
        // but reliance on the specific `message_notification` event is better for the toast interaction.
      }
    };

    const onMessageNotification = ({ message, senderName, conversationId }) => {
      // Only show if not in the conversation
      if (selectedConversation?._id !== conversationId) {
        addToast(`New message from ${senderName}: ${message}`, 'info', 4000);

        // Browser Notification fallback
        if (Notification.permission === 'granted' && document.hidden) {
          new Notification(`New Message from ${senderName}`, {
            body: message,
            icon: '/vite.svg'
          });
        }
      }
    };

    const onWalletNotification = ({ message, type }) => {
      addToast(message, type || 'success', 5000);
      if (Notification.permission === 'granted' && document.hidden) {
        new Notification('Wallet Update', {
          body: message,
          icon: '/vite.svg'
        });
      }
    };

    const onIncomingCall = (callData) => {
      setIncomingCall(callData);
    };

    s.on('new_message', onNewGlobal);
    s.on('message_notification', onMessageNotification);
    s.on('wallet_notification', onWalletNotification);
    s.on('incoming_call', onIncomingCall);

    return () => {
      s.off('new_message', onNewGlobal);
      s.off('message_notification', onMessageNotification);
      s.off('wallet_notification', onWalletNotification);
      s.off('incoming_call', onIncomingCall);
    };
  }, [token, user, selectedConversation, addToast]);

  // If token exists on load, try fetch current user
  React.useEffect(() => {
    if (!token) return;
    // if user already set (from login) skip
    if (user) return;
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: 'Bearer ' + token } })
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
                  const res = await fetch(`${API_URL}/conversations`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ members }) })
                  const data = await res.json();
                  setSelectedConversation(data.conversation)
                } catch (err) { console.error(err) }
              }}
              onSelectConversation={(conv) => setSelectedConversation(conv)}
              onGoHome={() => setSelectedConversation(null)}
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
                  onStartConversation={() => addToast('Chọn bạn bè hoặc tạo nhóm từ sidebar để bắt đầu chat!', 'info')}
                  onOpenSettings={() => setShowSettings(true)}
                />
              ) : (
                <>
                  <div className="chat-header">
                    {!isSearching ? (
                      <>
                        <button className="btn-icon" onClick={() => setSelectedConversation(null)} title="Quay về trang chủ"><IconArrowLeft size={18} /></button>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: selectedConversation.isGroup ? 'linear-gradient(135deg, #1e1b4b, #312e81)' : 'linear-gradient(135deg, #1e1b4b, #312e81)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedConversation.isGroup ? '#a5b4fc' : 'var(--accent)', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {selectedConversation.isGroup ? <IconHash size={15} /> : (getHeaderTitle() || '?').slice(0,1).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getHeaderTitle()}</div>
                          {selectedConversation.isGroup && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Group</div>}
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                          <button className="btn-icon" onClick={() => setIsSearching(true)} title="Search messages"><IconSearch size={17} /></button>
                          {!selectedConversation.isGroup && (
                            <>
                              <button className="btn-icon" title="Gọi thoại" onClick={() => {
                                const otherId = (selectedConversation.members || []).find(m => String(m) !== String(user?._id))
                                const otherName = selectedConversation.title || 'User'
                                setIncomingCall(null)
                                // Trigger outgoing call via ref
                                if (callModalRef.current?.startCall) callModalRef.current.startCall(otherId, otherName, 'voice')
                              }}><IconPhone size={16} /></button>
                              <button className="btn-icon" title="Gọi video" onClick={() => {
                                const otherId = (selectedConversation.members || []).find(m => String(m) !== String(user?._id))
                                const otherName = selectedConversation.title || 'User'
                                setIncomingCall(null)
                                if (callModalRef.current?.startCall) callModalRef.current.startCall(otherId, otherName, 'video')
                              }}><IconVideo size={16} /></button>
                            </>
                          )}
                          {selectedConversation.isGroup && (
                            <button className="btn-icon" title="Thành viên nhóm" onClick={() => setShowGroupInfo(v => !v)} style={{ color: showGroupInfo ? 'var(--accent)' : undefined }}><IconUsers size={16} /></button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 10 }}>
                        <IconSearch size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                        <input
                          autoFocus
                          className="search-input"
                          style={{ flex: 1, paddingLeft: 0, background: 'transparent', border: 'none' }}
                          placeholder="Search messages…"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                        <button className="btn-icon" onClick={() => { setIsSearching(false); setSearchQuery(''); }}><IconX size={16} /></button>
                      </div>
                    )}
                  </div>
                  <div className="chat-box" style={{ display: 'flex', minWidth: 0 }}>
                    <ChatRoom
                      token={token}
                      conversationId={selectedConversation._id}
                      user={user}
                      searchQuery={searchQuery}
                      conversation={selectedConversation}
                    />
                    {showGroupInfo && selectedConversation.isGroup && (
                      <GroupInfoPanel
                        token={token}
                        group={{ _id: selectedConversation.groupId, name: selectedConversation.title, conversationId: selectedConversation._id }}
                        conversationId={selectedConversation._id}
                        user={user}
                        onClose={() => setShowGroupInfo(false)}
                        onGroupUpdated={(update) => {
                          if (update.name) setSelectedConversation(c => ({ ...c, title: update.name }))
                        }}
                        onLeave={() => setSelectedConversation(null)}
                      />
                    )}
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
                await fetch(`${API_URL}/conversations/${selectedConversation._id}/mute`, {
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
                const ok = await showConfirm('Bạn có chắc muốn xóa toàn bộ tin nhắn trong cuộc trò chuyện này?', { title: 'Xóa lịch sử chat', confirmText: 'Xóa tất cả', danger: true });
                if (!ok) return;
                await fetch(`${API_URL}/conversations/${selectedConversation._id}/messages`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
                addToast('Đã xóa toàn bộ tin nhắn', 'success');
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

      {!selectedConversation && !showSettings && <NewsWidget />}

      {/* Call Modal — always mounted to catch incoming calls */}
      <CallModalWrapper
        ref={callModalRef}
        user={user}
        incomingCall={incomingCall}
        onClose={() => setIncomingCall(null)}
      />

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

// Wrapper that exposes startCall imperatively
const CallModalWrapper = React.forwardRef(function CallModalWrapper({ user, incomingCall, onClose }, ref) {
  const callRef = React.useRef(null)

  React.useImperativeHandle(ref, () => ({
    startCall: (targetId, targetName, callType) => {
      if (callRef.current) callRef.current.startCall?.(targetId, targetName, callType)
    }
  }))

  return <CallModalInner ref={callRef} user={user} incomingCall={incomingCall} onClose={onClose} />
})

const CallModalInner = React.forwardRef(function CallModalInner(props, ref) {
  const [activeCall, setActiveCall] = React.useState(null)
  const [incomingCallState, setIncomingCallState] = React.useState(null)

  React.useEffect(() => {
    if (props.incomingCall) setIncomingCallState(props.incomingCall)
  }, [props.incomingCall])

  React.useImperativeHandle(ref, () => ({
    startCall: (targetId, targetName, callType) => {
      setActiveCall({ targetId, targetName, callType, isOutgoing: true })
    }
  }))

  const effectiveCall = activeCall ? { ...activeCall, callId: 'out-' + Date.now(), caller: props.user } : incomingCallState

  if (!effectiveCall && !activeCall) return null

  return (
    <CallModal
      user={props.user}
      incomingCall={effectiveCall}
      onClose={() => {
        setActiveCall(null)
        setIncomingCallState(null)
        props.onClose?.()
      }}
    />
  )
})

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

createRoot(document.getElementById('root')).render(<App />)
