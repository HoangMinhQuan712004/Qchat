import React, { useEffect, useRef, useState, useCallback } from 'react'
import { getSocket } from '../socketService'
import { IconPhone, IconPhoneOff, IconVideo, IconVideoOff, IconVolumeX, IconVolume2, IconMaximize2 } from './QIcons'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

export default function CallModal({ user, incomingCall, onClose }) {
  // incomingCall: { callId, callType, caller, conversationId } | null
  const [callState, setCallState] = useState('idle') // idle | ringing | connecting | active
  const [activeCall, setActiveCall] = useState(null)  // { callId, callType, targetId, targetName, isIncoming }
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const timerRef = useRef(null)
  const pendingSdpRef = useRef(null)
  const pendingCandidatesRef = useRef([])

  // Show incoming or outgoing call when prop is set
  useEffect(() => {
    if (!incomingCall || callState !== 'idle') return
    const isOutgoing = !!incomingCall.isOutgoing
    const targetId = isOutgoing ? incomingCall.targetId : incomingCall.caller?.id
    const targetName = isOutgoing ? incomingCall.caller?.displayName : incomingCall.caller?.displayName
    setActiveCall({
      callId: incomingCall.callId,
      callType: incomingCall.callType || 'voice',
      targetId,
      targetName,
      isIncoming: !isOutgoing,
    })
    setCallState('ringing')
    // Auto-start outgoing call
    if (isOutgoing && targetId) {
      startOutgoingCall(incomingCall.callId, incomingCall.callType || 'voice', targetId)
    }
  }, [incomingCall])

  // Socket listeners for call events
  useEffect(() => {
    const s = getSocket()
    if (!s) return

    const onOffer = async ({ callId, sdp, callerId }) => {
      if (!pcRef.current) {
        pendingSdpRef.current = sdp
        return
      }
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
      // drain pending candidates
      for (const c of pendingCandidatesRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      }
      pendingCandidatesRef.current = []
      const answer = await pcRef.current.createAnswer()
      await pcRef.current.setLocalDescription(answer)
      s.emit('call_accept', { callId, targetUserId: callerId, sdp: answer })
    }

    const onAccepted = async ({ callId, sdp }) => {
      if (!pcRef.current) return
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
      for (const c of pendingCandidatesRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      }
      pendingCandidatesRef.current = []
      setCallState('active')
      startTimer()
    }

    const onRejected = () => {
      cleanup()
      onClose?.()
    }

    const onEnded = () => {
      cleanup()
      onClose?.()
    }

    const onIce = async ({ callId, candidate }) => {
      if (!candidate) return
      if (pcRef.current?.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      } else {
        pendingCandidatesRef.current.push(candidate)
      }
    }

    s.on('call_offer', onOffer)
    s.on('call_accepted', onAccepted)
    s.on('call_rejected', onRejected)
    s.on('call_ended', onEnded)
    s.on('ice_candidate', onIce)

    return () => {
      s.off('call_offer', onOffer)
      s.off('call_accepted', onAccepted)
      s.off('call_rejected', onRejected)
      s.off('call_ended', onEnded)
      s.off('ice_candidate', onIce)
    }
  }, [])

  function startTimer() {
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
  }

  function formatDuration(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  async function setupPeerConnection(callType, targetId, callId) {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc

    const constraints = callType === 'video'
      ? { video: true, audio: true }
      : { audio: true, video: false }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
    } catch (err) {
      console.error('getUserMedia failed:', err)
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    const s = getSocket()
    pc.onicecandidate = (event) => {
      if (event.candidate && s) {
        s.emit('ice_candidate', { callId, targetUserId: targetId, candidate: event.candidate })
      }
    }

    return pc
  }

  // Initiate outgoing call (called from useEffect when isOutgoing)
  async function startOutgoingCall(callId, callType, targetId) {
    const pc = await setupPeerConnection(callType, targetId, callId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    const s = getSocket()
    s?.emit('call_request', { targetUserId: targetId, callType, callId })
    s?.emit('call_offer', { callId, targetUserId: targetId, sdp: offer })
  }

  // Accept incoming call
  async function acceptCall() {
    if (!activeCall) return
    setCallState('connecting')

    await setupPeerConnection(activeCall.callType, activeCall.targetId, activeCall.callId)

    // If offer already received (via onOffer handler), it handled the answer
    // If not yet received, the onOffer handler will do it when it arrives
    if (pendingSdpRef.current) {
      const s = getSocket()
      const pc = pcRef.current
      await pc.setRemoteDescription(new RTCSessionDescription(pendingSdpRef.current))
      pendingSdpRef.current = null
      for (const c of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      }
      pendingCandidatesRef.current = []
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      s?.emit('call_accept', { callId: activeCall.callId, targetUserId: activeCall.targetId, sdp: answer })
      setCallState('active')
      startTimer()
    }
  }

  // Reject incoming call
  function rejectCall() {
    const s = getSocket()
    s?.emit('call_reject', { callId: activeCall?.callId, targetUserId: activeCall?.targetId })
    cleanup()
    onClose?.()
  }

  // Hang up
  function hangUp() {
    const s = getSocket()
    s?.emit('call_end', { callId: activeCall?.callId, targetUserId: activeCall?.targetId })
    cleanup()
    onClose?.()
  }

  function cleanup() {
    clearInterval(timerRef.current)
    setCallDuration(0)
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    pendingCandidatesRef.current = []
    pendingSdpRef.current = null
    setCallState('idle')
    setActiveCall(null)
    setIsMuted(false)
    setIsCamOff(false)
  }

  function toggleMute() {
    if (!localStreamRef.current) return
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(m => !m)
  }

  function toggleCamera() {
    if (!localStreamRef.current) return
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isCamOff })
    setIsCamOff(c => !c)
  }

  if (callState === 'idle' || !activeCall) return null

  const isVideo = activeCall.callType === 'video'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: 'var(--card)',
        borderRadius: 24,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xl)',
        width: isVideo && callState === 'active' ? 640 : 340,
        maxWidth: '95vw',
        overflow: 'hidden',
        animation: 'scaleIn 0.22s ease',
      }}>
        {/* Video area */}
        {isVideo && (
          <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9', display: callState === 'active' ? 'block' : 'none' }}>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <video ref={localVideoRef} autoPlay playsInline muted style={{
              position: 'absolute', bottom: 12, right: 12,
              width: 120, height: 90, objectFit: 'cover',
              borderRadius: 10, border: '2px solid rgba(255,255,255,0.3)'
            }} />
          </div>
        )}

        {/* Hidden audio remote */}
        {!isVideo && <video ref={remoteVideoRef} autoPlay playsInline style={{ display: 'none' }} />}
        {!isVideo && <video ref={localVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />}

        {/* Info panel */}
        <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
          {/* Avatar */}
          {(callState === 'ringing' || callState === 'connecting' || (!isVideo)) && (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e1b4b, #4338ca)',
              margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: 'var(--accent)',
              border: callState === 'ringing' ? '3px solid var(--accent)' : '3px solid transparent',
              animation: callState === 'ringing' ? 'ringPulse 1.5s infinite' : 'none',
            }}>
              {(activeCall.targetName || '?').slice(0, 1).toUpperCase()}
            </div>
          )}

          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
            {activeCall.targetName}
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 20 }}>
            {callState === 'ringing' && activeCall.isIncoming && 'Cuộc gọi đến…'}
            {callState === 'ringing' && !activeCall.isIncoming && 'Đang gọi…'}
            {callState === 'connecting' && 'Đang kết nối…'}
            {callState === 'active' && formatDuration(callDuration)}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            {/* Incoming: accept/reject */}
            {callState === 'ringing' && activeCall.isIncoming && (
              <>
                <CallBtn color="var(--danger)" onClick={rejectCall} title="Từ chối">
                  <IconPhoneOff size={22} />
                </CallBtn>
                <CallBtn color="var(--success)" onClick={acceptCall} title="Chấp nhận">
                  <IconPhone size={22} />
                </CallBtn>
              </>
            )}

            {/* Outgoing ringing: cancel */}
            {callState === 'ringing' && !activeCall.isIncoming && (
              <CallBtn color="var(--danger)" onClick={hangUp} title="Hủy">
                <IconPhoneOff size={22} />
              </CallBtn>
            )}

            {/* Active call controls */}
            {(callState === 'active' || callState === 'connecting') && (
              <>
                <CallBtn color={isMuted ? 'var(--danger)' : 'rgba(255,255,255,0.12)'} onClick={toggleMute} title={isMuted ? 'Bật mic' : 'Tắt mic'}>
                  {isMuted ? <IconVolumeX size={20} /> : <IconVolume2 size={20} />}
                </CallBtn>
                {isVideo && (
                  <CallBtn color={isCamOff ? 'var(--danger)' : 'rgba(255,255,255,0.12)'} onClick={toggleCamera} title={isCamOff ? 'Bật cam' : 'Tắt cam'}>
                    {isCamOff ? <IconVideoOff size={20} /> : <IconVideo size={20} />}
                  </CallBtn>
                )}
                <CallBtn color="var(--danger)" onClick={hangUp} title="Kết thúc">
                  <IconPhoneOff size={22} />
                </CallBtn>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.4); }
          50% { box-shadow: 0 0 0 14px rgba(129,140,248,0); }
        }
      `}</style>
    </div>
  )
}

function CallBtn({ color, onClick, title, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 54, height: 54, borderRadius: '50%',
        background: color, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', transition: 'transform 0.12s, opacity 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {children}
    </button>
  )
}

// Export helper to initiate call from outside
CallModal.startCall = null // will be set via ref pattern
