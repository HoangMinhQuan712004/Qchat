import React, { useState } from 'react'
import axios from 'axios'

export default function AuthForm({ onAuth }){
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
        const res = await axios.post('http://localhost:4000/auth/login', { email, password })
        onAuth(res.data.token, res.data.user)
      }else{
        const res = await axios.post('http://localhost:4000/auth/register', { username, email, password })
        onAuth(res.data.token, res.data.user)
      }
    }catch(err){
      alert(err.response?.data?.message || err.message)
    }finally{
      setLoading(false)
    }
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
    </div>
  )
}
