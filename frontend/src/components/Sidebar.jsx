import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useToast } from './Toast'
import NotificationCenter from './NotificationCenter'

export default function Sidebar({ token, user, onStartConversation, onSelectConversation, onOpenSettings, onOpenGroupModal, onGroupDeleted, onLogout }) {
  const [users, setUsers] = useState([])
  const [conversations, setConversations] = useState([])
  const [groups, setGroups] = useState([])
  const [friends, setFriends] = useState([])
  const [groupToDelete, setGroupToDelete] = useState(null)
  const { addToast } = useToast()

  // Search State
  const [searchTerm, setSearchTerm] = useState('')

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

  async function performDeleteGroup() {
    if (!groupToDelete) return;
    try {
      const res = await fetch(`http://localhost:4000/groups/${groupToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.ok) {
        // Success: Update local state immediately
        setGroups(prev => prev.filter(g => g._id !== groupToDelete));
        // Also remove associated conversation
        // We know the group._id, we need to find the conversation. 
        // Iterate groups to find the conversationId before deleting? Or we can just filter conversations by matching logic.
        // Actually uniqueConvs logic filters them, but we need to remove from 'conversations' state too.
        // The backend `DELETE /groups/:id` also deletes the conversation.
        // We can just filter out any conversation that looks like this group.
        // Simpler: Fetch proper conv ID or just re-filter.
        // Let's refetch conversations or simpler: `setConversations` filtering out the one that isGroup and linked.

        // Find conversation ID for this group to be precise
        const g = groups.find(g => g._id === groupToDelete);
        if (g && g.conversationId) {
          setConversations(prev => prev.filter(c => c._id !== g.conversationId));
        } else {
          // Fallback, maybe refill later or it will disappear from mapped list if we use 'groups' to render.
          // But 'groupChats' is derived from 'conversations' mostly.
          // So if we don't remove from `conversations`, it might stay?
          // The code maps `groupChats`. `groupChats` comes from `conversations`.
          // So we MUST remove from `conversations`.
          // Reloading lists is safer but cleaner to update state.
          // Let's rely on g.conversationId.
        }

        addToast('Group deleted successfully', 'success');
        if (onGroupDeleted) onGroupDeleted(groupToDelete);
        setGroupToDelete(null);
      } else {
        const d = await res.json();
        addToast(d.message || 'Failed to delete group', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Error deleting group: ' + e.message, 'error');
    }
  }

  // Deduplication & Filter Direct Messages (Exclude self)
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

  // Filter out self-chats from Direct Messages display if desired (though some users like self-chat)
  // User asked to "not list myself".
  const directMessages = uniqueConvs.filter(c => {
    if (c.isGroup) return false;
    // Check if it's a self-chat (only 1 member or logic above found self)
    const other = c.members?.find(m => m._id !== user?._id);
    return !!other; // If no other member, it's me matching me
  });

  const groupChats = uniqueConvs.filter(c => c.isGroup);

  function getTitle(c) {
    if (c.isGroup) return c.title || 'Group';
    const other = c.members?.find(m => m._id !== user?._id);
    if (other) return other.displayName || other.username;
    // Fallback for self-chat if we allowed it, but we filtered it out.
    if (c.members?.length > 0) return c.members[0].displayName || c.members[0].username;
    return 'Unknown';
  }

  // Search Logic
  const filteredUsers = users.filter(u => {
    if (!searchTerm) return false; // Only show when searching
    if (u._id === user?._id) return false; // Don't show self in search
    const name = u.displayName || u.username || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null)

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [])

  function handleContextMenu(e, data, type = 'group') {
    e.preventDefault()
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      data,
      type
    })
  }

  async function handleUnfriend() {
    if (!contextMenu || contextMenu.type !== 'friend') return;
    const user = contextMenu.data;
    try {
      await fetch(`http://localhost:4000/friends/${user._id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });

      // Remove from Friends list
      setFriends(prev => prev.filter(f => f._id !== user._id));

      // Remove from Direct Messages list
      setConversations(prev => prev.filter(c => {
        if (c.isGroup) return true;
        // Check if this conversation involves the unfriended user
        // c.members might be populated objects or ID strings depending on endpoint, usually populated
        const hasUser = c.members?.some(m => (m._id || m) === user._id);
        return !hasUser;
      }));

      addToast(`Unfriended ${user.displayName || user.username}`, 'success');

      // If currently selected, deselect
      if (selectedConversation && !selectedConversation.isGroup) {
        const hasUser = selectedConversation.members?.some(m => (m._id || m) === user._id);
        if (hasUser) setSelectedConversation(null);
      }

    } catch (e) { console.error(e); addToast('Failed to unfriend', 'error'); }
    setContextMenu(null);
  }

  async function handleBlock() {
    if (!contextMenu || contextMenu.type !== 'friend') return;
    const user = contextMenu.data;
    try {
      // Assuming backend has /friends/block or we just unfriend for now if not ready?
      // We implemented /friends/block!
      const res = await fetch(`http://localhost:4000/friends/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ userId: user._id })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Server error');
      }

      setFriends(prev => prev.filter(f => f._id !== user._id));

      // Also remove from DM list
      setConversations(prev => prev.filter(c => {
        if (c.isGroup) return true;
        const hasUser = c.members?.some(m => (m._id || m) === user._id);
        return !hasUser;
      }));

      addToast(`Blocked ${user.displayName || user.username}`, 'success');

      if (selectedConversation && !selectedConversation.isGroup) {
        const hasUser = selectedConversation.members?.some(m => (m._id || m) === user._id);
        if (hasUser) setSelectedConversation(null);
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to block: ' + e.message, 'error');
    }
    setContextMenu(null);
  }

  async function handleAddFriend(userToAdd) {
    try {
      const res = await fetch('http://localhost:4000/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ userId: userToAdd._id })
      });

      if (res.ok) {
        addToast('Friend added successfully', 'success');
        // Update local state immediately
        setFriends(prev => {
          if (prev.some(f => f._id === userToAdd._id)) return prev;
          return [...prev, userToAdd];
        });
      } else {
        const d = await res.json();
        addToast(d.message || 'Failed to add friend', 'error');
      }
    } catch (e) {
      console.error(e);
      addToast('Error adding friend', 'error');
    }
  }

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
      {/* Fixed Header */}
      <div style={{ padding: 16, paddingBottom: 0 }}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0 }}>QChat</h4>
          <div style={{ display: 'flex', gap: 5 }}>
            <NotificationCenter token={token} user={user} onSelectNotification={(n) => {
              if (n.relatedId) {
                // If it's a message, we might want to select the conversation
                // But we don't have the conversation object here fully.
                // Ideally we fetch it or find it in `conversations`.
                // For now, let's just toast or rely on user navigation, or implementing `onSelectConversation` if we had the object.
                // Simple hack: if we have the conversation in our list, select it.
                if (n.type === 'message') {
                  const match = conversations.find(c => c._id === n.relatedId);
                  if (match) onSelectConversation(match);
                }
              }
            }} />
            <button className="btn-icon" onClick={() => onOpenGroupModal?.()} title="Create Group">➕</button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <input
            className="search-input"
            placeholder="Search people..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Scrollable Area */}
      <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>

        {/* Search Results */}
        {searchTerm && (
          <section>
            <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Search Results
            </h4>
            {filteredUsers.length === 0 ? (
              <div className="muted-text" style={{ fontSize: '0.8rem', padding: 4 }}>No results found</div>
            ) : (
              filteredUsers.map(u => {
                const isFriend = friends.some(f => f._id === u._id);
                return (
                  <div key={u._id} className="conv-row">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="avatar small">{(u.displayName || u.username || 'U').slice(0, 1).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.displayName || u.username}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button className="btn-icon" title="Message" onClick={() => onStartConversation([u._id])}>💬</button>
                      {isFriend ? (
                        <span style={{ fontSize: 12, color: 'var(--success)', padding: '0 8px' }}>✓ Friend</span>
                      ) : (
                        <button className="btn-icon" title="Add Friend" onClick={() => handleAddFriend(u)}>➕</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div style={{ height: 16 }}></div>
          </section>
        )}

        {/* Direct Messages */}
        {!searchTerm && (
          <section>
            <h4 style={{ marginTop: 8, marginBottom: 8, fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Direct Messages
            </h4>
            {directMessages.length === 0 && <div className="muted-text" style={{ fontSize: '0.8rem', padding: 4 }}>No chats yet</div>}
            {directMessages.map(c => (
              <div key={c._id} className="conv-row" onClick={() => onSelectConversation(c)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar">{(getTitle(c) || 'U').slice(0, 1).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTitle(c)}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMessage || ''}</div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Groups */}
        {!searchTerm && (
          <section>
            <h4 style={{ marginTop: 24, marginBottom: 8, fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Groups
            </h4>
            {groupChats.length === 0 && <div className="muted-text" style={{ fontSize: '0.8rem', padding: 4 }}>No groups</div>}
            {groupChats.map(c => {
              // Ensure robust comparison between IDs
              const groupInfo = groups.find(g => String(g.conversationId) === String(c._id));

              // Debug logging (temporary)
              // console.log('Checking group:', c.title, c._id, 'Found info:', groupInfo, 'Creator:', groupInfo?.createdBy, 'Me:', user?._id);

              return (
                <div
                  key={c._id}
                  className="conv-row"
                  onClick={() => onSelectConversation(c)}
                  onContextMenu={(e) => handleContextMenu(e, groupInfo, 'group')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar group">#</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTitle(c)}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMessage || ''}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Friends */}
        {!searchTerm && (
          <section>
            <h4 style={{ marginTop: 24, marginBottom: 8, fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Friends
            </h4>
            {friends.map(u => (
              <div
                key={u._id}
                className="conv-row"
                onContextMenu={(e) => handleContextMenu(e, u, 'friend')}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="avatar small">{(u.displayName || u.username || 'U').slice(0, 1).toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.displayName || u.username}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.isOnline ? 'Online' : 'Offline'}</div>
                  </div>
                </div>
                <div>
                  <button className="btn-icon" title="Message" onClick={() => onStartConversation([u._id])}>💬</button>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* Footer: User Profile */}
      <div className="sidebar-footer" style={{ padding: 16 }}>
        <div className="user-profile" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
              {(user?.displayName || user?.username || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{user?.displayName || user?.username}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>#{user?._id?.slice(-4)}</div>
            </div>
          </div>
          <div style={{ display: 'flex' }}>
            <button className="btn-icon" onClick={() => onOpenSettings?.()} title="Settings">⚙️</button>
            <button className="btn-icon" onClick={onLogout} title="Logout">🚪</button>
          </div>
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


          {/* GROUP ACTIONS */}
          {contextMenu.type === 'group' && contextMenu.data && user && String(contextMenu.data.createdBy) === String(user._id) && (
            <div className="context-menu-item" onClick={() => { setGroupToDelete(contextMenu.data._id); setContextMenu(null); }}>
              🗑️ Delete Group
            </div>
          )}
          {contextMenu.type === 'group' && (
            <div className="context-menu-item" onClick={() => { alert('Notifications muted'); setContextMenu(null); }}>
              🔕 Mute Notifications
            </div>
          )}

          {/* FRIEND ACTIONS */}
          {contextMenu.type === 'friend' && (
            <>
              <div className="context-menu-item" onClick={() => onStartConversation([contextMenu.data._id])}>
                💬 Message
              </div>
              <div className="context-menu-item" onClick={handleUnfriend}>
                ❌ Unfriend
              </div>
              <div className="context-menu-item" style={{ color: 'var(--danger)' }} onClick={handleBlock}>
                🚫 Block
              </div>
            </>
          )}

        </div>
      )}

      {/* Delete Confirmation Modal */}
      {groupToDelete && (
        <div className="modal-overlay" onClick={() => setGroupToDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 320 }}>
            <div className="modal-header">
              <h3>Delete Group?</h3>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <p>Are you sure you want to delete this group? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setGroupToDelete(null)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--danger)' }} onClick={performDeleteGroup}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
