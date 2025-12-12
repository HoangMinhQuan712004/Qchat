import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Settings({ onClose, user }) {
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
        alert('Profile updated successfully')
      } else {
        alert('Profile updated locally (no backend connection)')
      }
    } catch (err) {
      alert('Unable to save to server. ' + err.message)
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
        </div>
      </div>
    </div>
  )
}
