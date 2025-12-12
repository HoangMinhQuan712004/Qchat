import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function GroupList({ token, onSelectGroup }){
  const [groups, setGroups] = useState([])

  useEffect(()=>{
    if(!token) return;
    axios.get('http://localhost:4000/groups', { headers: { Authorization: 'Bearer '+token } }).then(r=>setGroups(r.data.groups)).catch(()=>{})
  }, [token])

  return (
    <div style={{ padding: 8 }}>
      <h4 style={{ color: '#ddd' }}>Groups</h4>
      <div style={{ maxHeight: 300, overflow: 'auto' }}>
        {groups.map(g=> (
          <div key={g._id} style={{ padding: 6, borderBottom: '1px solid #333', color: '#ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>{g.name}</div>
              <div><button onClick={()=>onSelectGroup(g.conversationId)}>Open</button></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
