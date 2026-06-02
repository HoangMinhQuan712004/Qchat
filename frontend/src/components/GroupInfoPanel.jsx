import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'
import { useToast } from './Toast'
import {
  IconX, IconUsers, IconUserPlus, IconTrash, IconEdit,
  IconCheck, IconCrown, IconLogOut, IconUsersPlus
} from './QIcons'

export default function GroupInfoPanel({ token, group, conversationId, user, onClose, onGroupUpdated, onLeave }) {
  const { addToast, showConfirm } = useToast()
  const [members, setMembers] = useState([])
  const [myRole, setMyRole] = useState('member')
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [addSearch, setAddSearch] = useState('')
  const [addResults, setAddResults] = useState([])
  const [showAdd, setShowAdd] = useState(false)

  const authH = { Authorization: 'Bearer ' + token }

  useEffect(() => {
    if (!group?._id) return
    setLoading(true)
    fetch(`${API_URL}/groups/${group._id}`, { headers: authH })
      .then(r => r.json())
      .then(d => {
        setMembers(d.members || [])
        setMyRole(d.myRole || 'member')
        setNewName(d.group?.name || group.name || '')
      })
      .catch(() => addToast('Không tải được thông tin nhóm', 'error'))
      .finally(() => setLoading(false))
  }, [group?._id])

  async function saveName() {
    if (!newName.trim()) return
    try {
      const res = await fetch(`${API_URL}/groups/${group._id}`, {
        method: 'PUT',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (res.ok) {
        addToast('Đã đổi tên nhóm', 'success')
        setEditingName(false)
        onGroupUpdated?.({ name: newName.trim() })
      }
    } catch { addToast('Lỗi khi đổi tên', 'error') }
  }

  async function kickMember(memberId, memberName) {
    const ok = await showConfirm(`Kick ${memberName} khỏi nhóm?`, { confirmText: 'Kick', danger: true })
    if (!ok) return
    try {
      const res = await fetch(`${API_URL}/groups/${group._id}/members/${memberId}`, {
        method: 'DELETE', headers: authH
      })
      if (res.ok) {
        setMembers(prev => prev.filter(m => String(m.userId?._id) !== String(memberId)))
        addToast(`Đã kick ${memberName}`, 'success')
      } else {
        const d = await res.json()
        addToast(d.message || 'Lỗi', 'error')
      }
    } catch { addToast('Lỗi khi kick thành viên', 'error') }
  }

  async function leaveGroup() {
    const ok = await showConfirm('Rời nhóm này?', { confirmText: 'Rời nhóm', danger: true })
    if (!ok) return
    try {
      const res = await fetch(`${API_URL}/groups/${group._id}/leave`, {
        method: 'POST', headers: authH
      })
      if (res.ok) {
        addToast('Đã rời nhóm', 'success')
        onLeave?.()
        onClose()
      } else {
        const d = await res.json()
        addToast(d.message || 'Lỗi', 'error')
      }
    } catch { addToast('Lỗi khi rời nhóm', 'error') }
  }

  async function searchUsers(q) {
    if (!q.trim()) { setAddResults([]); return }
    try {
      const res = await fetch(`${API_URL}/users?search=${encodeURIComponent(q)}`, { headers: authH })
      const d = await res.json()
      const existing = new Set(members.map(m => String(m.userId?._id)))
      setAddResults((d.users || []).filter(u => !existing.has(String(u._id))))
    } catch {}
  }

  async function addMember(userId, name) {
    try {
      const res = await fetch(`${API_URL}/groups/${group._id}/members`, {
        method: 'POST',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        addToast(`Đã thêm ${name}`, 'success')
        setAddResults(prev => prev.filter(u => String(u._id) !== String(userId)))
        // Refresh members
        fetch(`${API_URL}/groups/${group._id}`, { headers: authH })
          .then(r => r.json())
          .then(d => setMembers(d.members || []))
      } else {
        const d = await res.json()
        addToast(d.message || 'Lỗi', 'error')
      }
    } catch { addToast('Lỗi khi thêm thành viên', 'error') }
  }

  const groupName = group?.title || group?.name || 'Group'

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 300, background: 'var(--bg-panel)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 800, animation: 'slideInRight 0.22s ease',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.35)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1 }}>
          {editingName ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                style={{ padding: '5px 10px', fontSize: '0.875rem' }}
                autoFocus
              />
              <button className="btn-icon" onClick={saveName} style={{ color: 'var(--success)' }}>
                <IconCheck size={16} />
              </button>
              <button className="btn-icon" onClick={() => setEditingName(false)}>
                <IconX size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{newName || groupName}</span>
              {myRole === 'admin' && (
                <button className="btn-icon" onClick={() => setEditingName(true)} style={{ width: 24, height: 24 }}>
                  <IconEdit size={13} />
                </button>
              )}
            </div>
          )}
        </div>
        <button className="btn-icon" onClick={onClose}><IconX size={17} /></button>
      </div>

      {/* Members count */}
      <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconUsers size={14} style={{ color: 'var(--muted)' }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>
          {members.length} thành viên
        </span>
        {myRole === 'admin' && (
          <button
            className="btn-icon"
            style={{ marginLeft: 'auto', width: 26, height: 26 }}
            title="Thêm thành viên"
            onClick={() => setShowAdd(v => !v)}
          >
            <IconUsersPlus size={14} />
          </button>
        )}
      </div>

      {/* Add member search */}
      {showAdd && myRole === 'admin' && (
        <div style={{ padding: '0 12px 8px' }}>
          <input
            className="search-input"
            placeholder="Tìm người dùng..."
            value={addSearch}
            onChange={e => { setAddSearch(e.target.value); searchUsers(e.target.value) }}
            style={{ paddingLeft: 10 }}
          />
          {addResults.length > 0 && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', marginTop: 4, overflow: 'hidden'
            }}>
              {addResults.slice(0, 5).map(u => (
                <div key={u._id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="avatar small">{(u.displayName || u.username || 'U').slice(0, 1).toUpperCase()}</div>
                  <span style={{ fontSize: '0.85rem', flex: 1 }}>{u.displayName || u.username}</span>
                  <button className="btn-icon" style={{ width: 24, height: 24, color: 'var(--success)' }}
                    onClick={() => addMember(u._id, u.displayName || u.username)}>
                    <IconUserPlus size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
            Đang tải...
          </div>
        ) : members.map(m => {
          const u = m.userId
          if (!u) return null
          const name = u.displayName || u.username || 'User'
          const isMe = String(u._id) === String(user?._id)
          const isAdmin = m.role === 'admin'

          return (
            <div key={String(u._id)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 8px', borderRadius: 'var(--radius-md)',
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ position: 'relative' }}>
                <div className="avatar small">{name.slice(0, 1).toUpperCase()}</div>
                {u.isOnline && (
                  <div style={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 9, height: 9, borderRadius: '50%',
                    background: 'var(--success)', border: '2px solid var(--bg-panel)'
                  }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {name} {isMe && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(bạn)</span>}
                </div>
                <div style={{ fontSize: '0.7rem', color: isAdmin ? 'var(--accent)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {isAdmin && <IconCrown size={9} />}
                  {isAdmin ? 'Admin' : 'Thành viên'}
                </div>
              </div>
              {myRole === 'admin' && !isMe && !isAdmin && (
                <button
                  className="btn-icon"
                  style={{ width: 26, height: 26, color: 'var(--danger)', opacity: 0.7 }}
                  title={`Kick ${name}`}
                  onClick={() => kickMember(u._id, name)}
                >
                  <IconTrash size={13} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        {myRole !== 'admin' && (
          <button
            className="btn"
            style={{ width: '100%', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', gap: 8 }}
            onClick={leaveGroup}
          >
            <IconLogOut size={15} /> Rời nhóm
          </button>
        )}
      </div>
    </div>
  )
}
