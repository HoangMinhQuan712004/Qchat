import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useToast } from '../components/Toast'

export default function Settings({ onClose, user }) {
  const { addToast } = useToast();
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('qchat_theme') || 'dark' } catch (e) { return 'dark' }
  })
  const [profile, setProfile] = useState({
    displayName: user?.displayName || user?.username || '',
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || ''
  })
  const [activeTab, setActiveTab] = useState('account')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try { document.body.setAttribute('data-theme', theme) } catch (e) { }
    try { localStorage.setItem('qchat_theme', theme) } catch (e) { }
  }, [theme])

  // Sync profile when user prop changes
  useEffect(() => {
    setProfile({
      displayName: user?.displayName || user?.username || '',
      username: user?.username || '',
      email: user?.email || '',
      bio: user?.bio || ''
    })
  }, [user])

  async function saveProfile() {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const res = await fetch('http://localhost:4000/users/me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify(profile)
        })
        if (!res.ok) throw new Error('save-failed')
        addToast('Profile updated successfully', 'success')
      } else {
        addToast('Profile updated locally (no backend connection)', 'info')
      }
    } catch (err) {
      addToast('Unable to save to server. ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-overlay">
      <div className="settings-container">
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">
            <h2>Settings</h2>
          </div>
          <nav className="settings-nav">
            <button
              className={`nav-item ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              My Account
            </button>
            <button
              className={`nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              Appearance
            </button>
            <button
              className={`nav-item ${activeTab === 'blocked' ? 'active' : ''}`}
              onClick={() => setActiveTab('blocked')}
            >
              Blocked Users
            </button>
            <button
              className={`nav-item ${activeTab === 'wallet' ? 'active' : ''}`}
              onClick={() => setActiveTab('wallet')}
            >
              Wallet
            </button>
          </nav>
          <div className="settings-footer">
            <button className="btn ghost" onClick={onClose} style={{ width: '100%' }}>Close</button>
          </div>
        </div>

        <div className="settings-content">
          {activeTab === 'account' && (
            <div className="settings-section fade-in">
              <h3>My Account</h3>
              <div className="profile-card">
                <div className="profile-banner" style={{ background: profile.color || 'linear-gradient(90deg, #ff9a5b, #ff7b5b)' }}></div>
                <div className="profile-header-info">
                  <div className="profile-avatar-large">
                    {(profile.displayName || 'U').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="profile-names">
                    <span className="profile-name-main">{profile.displayName}</span>
                    <span className="profile-name-sub">@{profile.username}</span>
                  </div>
                </div>
                <div className="profile-edit-form">
                  <div className="form-group">
                    <label>Display Name</label>
                    <input
                      className="input"
                      value={profile.displayName}
                      onChange={e => setProfile({ ...profile, displayName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      className="input"
                      value={profile.username}
                      onChange={e => setProfile({ ...profile, username: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      className="input"
                      value={profile.email}
                      onChange={e => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>

                  <div className="form-actions">
                    <button className="btn primary" onClick={saveProfile} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section fade-in">
              <h3>Appearance</h3>
              <div className="theme-options">
                <div
                  className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <div className="theme-preview dark"></div>
                  <span>Dark Theme</span>
                </div>
                <div
                  className={`theme-card ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <div className="theme-preview light"></div>
                  <span>Light Theme</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'blocked' && (
            <BlockedUsersTab />
          )}

          {activeTab === 'wallet' && (
            <WalletTab user={user} addToast={addToast} />
          )}
        </div>
      </div>
    </div>
  )
}

function WalletTab({ user, addToast }) {
  const [balance, setBalance] = useState(user.balance || 0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // Transfer Form
  const [toUsername, setToUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Fetch history & refresh balance on mount
  useEffect(() => {
    loadData();
  }, []);

  // Search users effect
  useEffect(() => {
    if (!toUsername) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:4000/users?q=${toUsername}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const filtered = (data.users || []).filter(u => u._id !== user._id && u.username !== user.username);
        setSuggestions(filtered);
      } catch (e) { }
    }, 300);
    return () => clearTimeout(timer);
  }, [toUsername, user._id, user.username]);

  async function loadData() {
    const token = localStorage.getItem('token');
    try {
      const meRes = await fetch('http://localhost:4000/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      const meData = await meRes.json();
      if (meData.user) setBalance(meData.user.balance || 0);

      const histRes = await fetch('http://localhost:4000/wallet/history', { headers: { Authorization: 'Bearer ' + token } });
      const histData = await histRes.json();
      setHistory(histData.transactions || []);
    } catch (e) {
      console.error(e);
    }
  }

  const [confirmModal, setConfirmModal] = useState(null);

  function handleTransfer() {
    if (!toUsername || !amount) return addToast('Please fill all fields', 'warning');
    setConfirmModal({ toUsername, amount });
  }

  async function executeTransfer() {
    if (!confirmModal) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ toUsername: confirmModal.toUsername, amount: Number(confirmModal.amount) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');

      addToast('Transfer Successful!', 'success');
      setBalance(data.balance);
      setAmount('');
      setToUsername('');
      loadData();
    } catch (err) {
      addToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  }

  return (
    <div className="settings-section fade-in">
      <h3>My Wallet</h3>
      <div className="wallet-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 20, borderRadius: 12, color: 'white', marginBottom: 20 }}>
        <div style={{ opacity: 0.8 }}>Current Balance</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{balance.toLocaleString()} <span style={{ fontSize: '1rem' }}>TOKENS</span></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
        {/* Transfer Form */}
        <div>
          <h4>Transfer Money</h4>
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Recipient Username</label>
            <input
              className="input"
              placeholder="Search user..."
              value={toUsername}
              onChange={e => setToUsername(e.target.value)}
              onBlur={() => setTimeout(() => setSuggestions([]), 200)}
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div className="suggestions-dropdown" style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#2d3748', border: '1px solid #4a5568',
                zIndex: 10, borderRadius: '0 0 8px 8px', maxHeight: 200, overflowY: 'auto',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}>
                {suggestions.map(u => (
                  <div key={u._id}
                    onClick={() => { setToUsername(u.username); setSuggestions([]); }}
                    style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #4a5568', display: 'flex', flexDirection: 'column' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#4a5568'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: 600, color: 'white' }}>{u.displayName}</span>
                    <span style={{ fontSize: '0.85em', color: '#a0aec0' }}>@{u.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input className="input" type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <button className="btn primary" onClick={handleTransfer} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Sending...' : 'Send Tokens'}
          </button>
        </div>

        {/* History Table */}
        <div>
          <h4>Transaction History</h4>
          <div className="custom-scroll" style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: 10, textAlign: 'left' }}>Date</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Details</th>
                  <th style={{ padding: 10, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan="3" style={{ padding: 20, textAlign: 'center', opacity: 0.6 }}>No transactions yet</td></tr>
                )}
                {history.map(tx => {
                  const isIncoming = tx.toUser?._id === user._id || tx.toUser === user._id;
                  const amISender = (tx.fromUser?._id || tx.fromUser) === user._id;
                  const isSystem = tx.type === 'SYSTEM' || tx.type === 'REWARD' || !tx.fromUser;

                  return (
                    <tr key={tx._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 10, color: '#a0aec0', fontSize: '0.8em' }}>
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: 10 }}>
                        {isSystem ? (
                          <span style={{ color: '#ecc94b' }}>System Reward</span>
                        ) : amISender ? (
                          <span>To: <strong>{tx.toUser?.displayName || tx.toUser?.username || 'Unknown'}</strong></span>
                        ) : (
                          <span>From: <strong>{tx.fromUser?.displayName || tx.fromUser?.username || 'Unknown'}</strong></span>
                        )}
                      </td>
                      <td style={{ padding: 10, textAlign: 'right', fontWeight: 'bold', color: isIncoming ? 'var(--success)' : 'var(--danger)' }}>
                        {isIncoming ? '+' : '-'}{tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="modal-content" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, minWidth: 320, maxWidth: 400, border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0 }}>Confirm Transfer</h3>
            <p>Are you sure you want to send <strong>{confirmModal.amount}</strong> tokens to <strong>@{confirmModal.toUsername}</strong>?</p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn ghost" onClick={() => setConfirmModal(null)} disabled={loading}>Cancel</button>
              <button className="btn primary" onClick={executeTransfer} disabled={loading}>
                {loading ? 'Sending...' : 'Confirm Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BlockedUsersTab() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:4000/friends/blocked', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json())
      .then(d => {
        setBlocked(d.blocked || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleUnblock(id) {
    if (!confirm('Unblock this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:4000/friends/block/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
      setBlocked(prev => prev.filter(u => u._id !== id));
    } catch (e) { alert('Failed to unblock'); }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="settings-section fade-in">
      <h3>Blocked Users</h3>
      {blocked.length === 0 && <div className="muted-text">No blocked users</div>}
      {blocked.map(u => (
        <div key={u._id} className="blocked-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="avatar small">{(u.displayName || u.username || 'U').slice(0, 1).toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{u.displayName || u.username}</div>
            </div>
          </div>
          <button className="btn small ghost" style={{ color: 'var(--success)', border: '1px solid var(--success)' }} onClick={() => handleUnblock(u._id)}>Unblock</button>
        </div>
      ))}
    </div>
  );
}
