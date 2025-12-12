import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Sidebar({ token, user, onStartConversation, onAddFriend, onSelectConversation, onOpenSettings, onOpenGroupModal, onDeleteGroup }) {
  const [users, setUsers] = useState([])
  const [conversations, setConversations] = useState([])
  const [groups, setGroups] = useState([]) // New: store groups info
  const [friends, setFriends] = useState([])
  const [groupToDelete, setGroupToDelete] = useState(null)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('qchat_theme') || 'dark' } catch (e) { return 'dark' }
  })

  useEffect(() => {
    if (!token) return;
    axios.get('http://localhost:4000/users', { headers: { Authorization: 'Bearer ' + token } }).then(r => setUsers(r.data.users)).catch(() => { })
    axios.get('http://localhost:4000/conversations', { headers: { Authorization: 'Bearer ' + token } }).then(r => setConversations(r.data.conversations)).catch(() => { })
    axios.get('http://localhost:4000/friends', { headers: { Authorization: 'Bearer ' + token } }).then(r => setFriends(r.data.friends)).catch(() => { })
    axios.get('http://localhost:4000/groups', { headers: { Authorization: 'Bearer ' + token } }).then(r => setGroups(r.data.groups)).catch(() => { })
  }, [token])

  useEffect(() => {
    try { document.body.setAttribute('data-theme', theme) } catch (e) { }
    try { localStorage.setItem('qchat_theme', theme) } catch (e) { }
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  // Deduplication
  const uniqueConvs = [];
  const seenKeys = new Set();
  const sorted = [...conversations].sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));

  for (const c of sorted) {
    let key = c._id;
    if (!c.isGroup && c.members) {
      const other = c.members.find(m => m._id !== user?._id) || c.members[0];
      if (other) key = 'user:' + other._id;
    }

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueConvs.push(c);
    }
  }

  const directMessages = uniqueConvs.filter(c => !c.isGroup);
  const groupChats = uniqueConvs.filter(c => c.isGroup);

  function getTitle(c) {
    if (c.isGroup) return c.title || 'Group';
    const other = c.members?.find(m => m._id !== user?._id);
    if (other) return other.displayName || other.username;
    if (c.members?.length > 0) return c.members[0].displayName || c.members[0].username;
    return 'Unknown';
  }

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null) // { x, y, group }

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [])

  function handleContextMenu(e, group) {
    e.preventDefault()
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      group
    })
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h4 style={{ margin: 0 }}>QChat</h4>
        <button className="btn-icon" onClick={() => onOpenSettings?.()} title="Settings">⚙️</button>
      </div>

      {/* Direct Messages */}
      <section>
        <h4 style={{ marginTop: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Direct Messages
        </h4>
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          {directMessages.length === 0 && <div className="muted-text" style={{ padding: '0 8px', fontSize: '0.8rem' }}>No chats yet</div>}
          {directMessages.map(c => (
            <div key={c._id} className="conv-row" onClick={() => onSelectConversation(c)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar">{(getTitle(c) || 'U').slice(0, 1).toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTitle(c)}</div>
                  <div style={{ fontSize: 12, color: 'rgba(230,238,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMessage || ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Groups */}
      <section>
        <h4 style={{ marginTop: 16, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Groups
          <button className="btn-icon small" style={{ width: 24, height: 24, fontSize: 14 }} onClick={() => onOpenGroupModal?.()} title="Create Group">+</button>
        </h4>
        <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 12 }}>
          {groupChats.length === 0 && <div className="muted-text" style={{ padding: '0 8px', fontSize: '0.8rem' }}>No groups</div>}
          {groupChats.map(c => {
            const groupInfo = groups.find(g => g.conversationId === c._id);
            // const isCreator = groupInfo && user && groupInfo.createdBy === user._id; // Used inside menu logic now

            return (
              <div
                key={c._id}
                className="conv-row"
                onClick={() => onSelectConversation(c)}
                onContextMenu={(e) => handleContextMenu(e, groupInfo)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar group">#</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTitle(c)}</div>
                    <div style={{ fontSize: 12, color: 'rgba(230,238,248,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMessage || ''}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h4>Friends</h4>
        <div style={{ maxHeight: 160, overflow: 'auto', marginBottom: 12 }}>
          {friends.map(u => (
            <div key={u._id} className="conv-row" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="avatar">{(u.displayName || u.username || 'U').slice(0, 1).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.displayName || u.username}</div>
                  <div style={{ fontSize: 12, color: 'rgba(230,238,248,0.6)' }}>{u.isOnline ? 'Online' : 'Offline'}</div>
                </div>
              </div>
              <div>
                <button className="btn" onClick={() => onStartConversation([u._id])}>Message</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4>All People</h4>
        <div style={{ maxHeight: 260, overflow: 'auto' }}>
          {users.map(u => (
            <div key={u._id} className="conv-row">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="avatar">{(u.displayName || u.username || 'U').slice(0, 1).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.displayName || u.username}</div>
                  <div style={{ fontSize: 12, color: 'rgba(230,238,248,0.6)' }}>{u.isOnline ? 'Online' : 'Offline'}</div>
                </div>
              </div>
              <div>
                <button className="btn" onClick={() => onStartConversation([u._id])}>Message</button>
                <button className="btn ghost" onClick={() => onAddFriend(u._id)} style={{ marginLeft: 8 }}>Add</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: 'rgba(230,238,248,0.7)' }}>Settings</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn ghost" onClick={() => onOpenSettings?.()}>Settings</button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            position: 'fixed',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 4,
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            minWidth: 150
          }}
        >
          {contextMenu.group && user && contextMenu.group.createdBy === user._id && (
            <div className="context-menu-item" onClick={() => setGroupToDelete(contextMenu.group._id)}>
              🗑️ Delete Group
            </div>
          )}
          <div className="context-menu-item" onClick={() => alert('Notifications muted')}>
            🔕 Mute Notifications
          </div>
          <div className="context-menu-item" onClick={() => alert('User blocked (simulation)')}>
            🚫 Block
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {groupToDelete && (
        <div className="modal-overlay" onClick={() => setGroupToDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 320 }}>
            <div className="modal-header">
              <h3>Delete Group?</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this group? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setGroupToDelete(null)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--danger)' }} onClick={() => { onDeleteGroup?.(groupToDelete); setGroupToDelete(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
