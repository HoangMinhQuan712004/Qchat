import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL } from '../config'
import { useToast } from './Toast'

export default function CreateGroupModal({ token, onClose, onCreated }) {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [friends, setFriends] = useState([])
  const [selectedFriends, setSelectedFriends] = useState(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    axios.get(`${API_URL}/friends`, { headers: { Authorization: 'Bearer ' + token } })
      .then(r => setFriends(r.data.friends))
      .catch(() => { })
  }, [token])

  async function create() {
    if (!name.trim()) return addToast('Vui lòng nhập tên nhóm', 'warning')
    if (selectedFriends.size === 0) return addToast('Vui lòng chọn ít nhất một thành viên', 'warning')

    setLoading(true)
    try {
      const memberIds = Array.from(selectedFriends)
      const res = await axios.post(`${API_URL}/groups`, { name, memberIds }, { headers: { Authorization: 'Bearer ' + token } })
      addToast(`Đã tạo nhóm "${name}"`, 'success')
      onCreated(res.data.group)
      onClose()
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleFriend = (id) => {
    const next = new Set(selectedFriends)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedFriends(next)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 440, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Tạo nhóm mới</h3>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18 }}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <label className="input-label">Tên nhóm</label>
          <input
            className="input"
            placeholder="VD: Nhóm dự án, Bạn bè..."
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />

          <label className="input-label" style={{ marginTop: 16 }}>Chọn thành viên</label>
          <div className="friends-list-select">
            {friends.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                Chưa có bạn bè. Thêm bạn bè trước nhé!
              </div>
            ) : (
              friends.map(u => (
                <div
                  key={u._id}
                  className={`friend-select-item ${selectedFriends.has(u._id) ? 'selected' : ''}`}
                  onClick={() => toggleFriend(u._id)}
                >
                  <div className="avatar small">{(u.displayName || u.username || 'U').slice(0, 1).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>{u.displayName || u.username}</div>
                  <div className="checkbox-indicator">{selectedFriends.has(u._id) && '✓'}</div>
                </div>
              ))
            )}
          </div>
          {selectedFriends.size > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              Đã chọn {selectedFriends.size} thành viên
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Hủy</button>
          <button className="btn" onClick={create} disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo nhóm'}
          </button>
        </div>
      </div>
    </div>
  )
}
