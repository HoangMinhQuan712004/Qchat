import React, { useState } from 'react'
import axios from 'axios'
import { API_URL } from '../config'
import { useToast } from './Toast'

export default function AuthForm({ onAuth }){
  const { addToast } = useToast()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e){
    e.preventDefault()
    setLoading(true)
    try{
      if(mode==='login'){
        const res = await axios.post(`${API_URL}/auth/login`, { email, password })
        onAuth(res.data.token, res.data.user)
      }else{
        const res = await axios.post(`${API_URL}/auth/register`, { username, email, password })
        onAuth(res.data.token, res.data.user)
      }
    }catch(err){
      addToast(err.response?.data?.message || err.message, 'error')
    }finally{
      setLoading(false)
    }
  }

  function loginWithGoogle(){
    window.location.href = `${API_URL}/auth/google`
  }

  return (
    <div className="auth-card">
      <h2>{mode==='login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={submit}>
        {mode==='register' && (
          <div className="form-row"><input className="input" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} /></div>
        )}
        <div className="form-row"><input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div className="form-row"><input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Please wait...' : (mode==='login' ? 'Login' : 'Register')}</button>
          <button type="button" className="btn ghost" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login' ? 'Switch to register' : 'Switch to login'}</button>
        </div>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>hoặc</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <button
        type="button"
        onClick={loginWithGoogle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'white', color: '#333', fontWeight: 600, fontSize: 15, cursor: 'pointer'
        }}
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={20} height={20} alt="Google" />
        Đăng nhập bằng Google
      </button>
    </div>
  )
}
