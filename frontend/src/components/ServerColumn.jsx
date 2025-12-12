import React from 'react'

export default function ServerColumn(){
  const servers = [ { id: 'home', name: 'Home' }, { id: 'srv1', name: 'Server 1' }, { id: 'srv2', name: 'Server 2' } ];
  return (
    <div style={{ width: 72, background: '#202225', color: '#ddd', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
      {servers.map(s=> (
        <div key={s.id} title={s.name} style={{ width: 48, height: 48, borderRadius: 12, background: '#36393f', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{s.name[0]}</div>
      ))}
    </div>
  )
}
