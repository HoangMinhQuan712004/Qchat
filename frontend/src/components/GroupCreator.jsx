import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function CreateGroupModal({ token, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [friends, setFriends] = useState([])
  const [selectedFriends, setSelectedFriends] = useState(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch friends to select from
    axios.get('http://localhost:4000/friends', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => setFriends(r.data.friends))
      .catch(() => { })
  }, [token])

  async function create() {
    if (!name.trim()) return alert('Please enter a group name')
    if (selectedFriends.size === 0) return alert('Please select at least one friend')

    setLoading(true)
    try {
      const memberIds = Array.from(selectedFriends)
      const res = await axios.post('http://localhost:4000/groups', { name, memberIds }, { headers: { Authorization: 'Bearer ' + token } })
      onCreated(res.data.group)
      onClose()
    } catch (err) {
      alert(err.response?.data?.message || err.message)
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
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Create a New Group</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label className="input-label">Group Name</label>
          <input
            className="input"
            placeholder="e.g. Project Team, Weekend Plans"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <label className="input-label" style={{ marginTop: 16 }}>Select Members</label>
          <div className="friends-list-select">
            {friends.length === 0 ? (
              <div className="muted small">No friends found. Add friends first!</div>
            ) : (
              friends.map(u => (
                <div
                  key={u._id}
                  className={`friend-select-item ${selectedFriends.has(u._id) ? 'selected' : ''}`}
                  onClick={() => toggleFriend(u._id)}
                >
                  <div className="avatar small">{(u.displayName || u.username || 'U').slice(0, 1).toUpperCase()}</div>
                  <div className="friend-name">{u.displayName || u.username}</div>
                  <div className="checkbox-indicator">
                    {selectedFriends.has(u._id) && '✓'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={create} disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}
