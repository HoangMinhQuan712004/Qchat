import React from 'react'
import AuthForm from '../components/AuthForm'

export default function AuthPage({ onAuth }){
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 960, width: '100%', display: 'flex', gap: 24, padding: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', marginBottom: 12 }}>
            <h1 style={{ margin: 0 }}>Welcome to Qchat</h1>
            <p style={{ marginTop: 6, color: 'rgba(230,238,248,0.8)' }}>Fast, simple and secure real-time chat to get you started.</p>
          </div>
          <div style={{ marginTop: 20 }}>
            <AuthForm onAuth={onAuth} />
          </div>
        </div>
        <div style={{ width: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'rgba(230,238,248,0.9)' }}>
            <div style={{ width: 120, height: 120, margin: '0 auto', borderRadius: 20, background: 'linear-gradient(180deg,#2b065b,#6b21a8)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize: 36 }}>Q</div>
            <h3 style={{ marginTop: 14 }}>Connect instantly</h3>
            <p style={{ color: 'rgba(230,238,248,0.7)' }}>Create an account or login to join conversations with friends and groups.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
