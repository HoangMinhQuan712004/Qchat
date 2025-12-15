import React, { useEffect, useState, useRef } from 'react'
import { getSocket } from '../socketService'
import { useChatStore } from '../stores/useChatStore'
import axios from 'axios'

export default function ChatRoom({ token, conversationId, user, searchQuery }) {
  const [text, setText] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesStore = useChatStore(s => s.messages);
  const addMessage = useChatStore(s => s.addMessage);

  // Filter messages based on search query
  const messages = searchQuery
    ? messagesStore.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messagesStore;

  const prependMessages = useChatStore(s => s.prependMessages) || ((newMsgs) => useChatStore.setState(state => ({ messages: [...newMsgs, ...state.messages] }))); // Fallback if store doesn't have prepend

  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // File & Recording
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const audioChunksRef = useRef([]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const tokenHeader = token ? { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/form-data' } } : {};
      // Upload
      const res = await axios.post('http://localhost:4000/upload', formData, tokenHeader);
      const { url, mimetype, filename } = res.data;

      let type = 'file';
      if (mimetype.startsWith('image/')) type = 'image';
      else if (mimetype.startsWith('video/')) type = 'video';
      else if (mimetype.startsWith('audio/')) type = 'audio';

      // Send message
      const msgData = {
        conversationId,
        text: '',
        type,
        attachments: [{ url, name: filename }]
      };

      if (getSocket()) {
        getSocket().emit('send_message', msgData);
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
    e.target.value = null; // reset
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'voice.webm');

        try {
          const tokenHeader = token ? { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/form-data' } } : {};
          const res = await axios.post('http://localhost:4000/upload', formData, tokenHeader);
          getSocket().emit('send_message', { conversationId, text: '', type: 'audio', attachments: [{ url: res.data.url, name: 'Voice Message' }] });
        } catch (e) { console.error(e); }
        stream.getTracks().forEach(t => t.stop());
      };

      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert('Mic access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    // listen socket events
    const s = getSocket();
    if (!s) return;
    const onNew = ({ message }) => {
      // only add if it belongs to this conversation
      if (message.conversationId === conversationId) {
        addMessage(message);
        // If user is near bottom, scroll to bottom
        if (scrollRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
          if (scrollHeight - scrollTop - clientHeight < 100) {
            setTimeout(() => {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 50);
          }
        }
      }
    };

    const onTyping = ({ conversationId: cid, userId, isTyping }) => {
      if (cid !== conversationId) return;
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    s.on('new_message', onNew);
    s.on('typing', onTyping);
    return () => {
      s.off('new_message', onNew);
      s.off('typing', onTyping);
    }
  }, [addMessage, conversationId]);

  useEffect(() => {
    // when conversation changes, fetch recent history
    setTypingUsers(new Set());
    setHasMore(true);
    async function join() {
      if (!conversationId) return;
      try {
        const tokenHeader = token ? { headers: { Authorization: 'Bearer ' + token } } : {};
        // Load only 6 messages as requested
        const res = await axios.get(`http://localhost:4000/messages/${conversationId}?limit=6`, tokenHeader);

        useChatStore.setState({ messages: res.data.messages });

        // If we got fewer than 6, no more to load
        if (res.data.messages.length < 6) setHasMore(false);

        const s = getSocket();
        if (s) s.emit('join_room', { conversationId });

        // Scroll to bottom on initial load
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 0);

      } catch (err) {
        console.warn('Failed to load messages', err.message);
      }
    }
    join();
  }, [conversationId, token]);

  // Scroll restoration logic
  const isPrependingRef = useRef(false);
  const prevScrollHeightRef = useRef(0);

  React.useLayoutEffect(() => {
    if (isPrependingRef.current && scrollRef.current) {
      const newScrollHeight = scrollRef.current.scrollHeight;
      const diff = newScrollHeight - prevScrollHeightRef.current;
      if (diff > 0) {
        scrollRef.current.scrollTop += diff;
      }
      isPrependingRef.current = false;
    }
  }, [messages]);

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    // Capture current scroll height before fetching/updating
    if (scrollRef.current) {
      prevScrollHeightRef.current = scrollRef.current.scrollHeight;
    }

    try {
      const firstMsg = messages[0];
      if (!firstMsg) {
        setIsLoadingMore(false);
        return;
      }

      const tokenHeader = token ? { headers: { Authorization: 'Bearer ' + token } } : {};
      const res = await axios.get(`http://localhost:4000/messages/${conversationId}?limit=6&before=${firstMsg.createdAt}`, tokenHeader);

      const newMessages = res.data.messages;
      if (newMessages.length < 6) setHasMore(false);

      if (newMessages.length > 0) {
        isPrependingRef.current = true;
        useChatStore.setState(state => ({ messages: [...newMessages, ...state.messages] }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleScroll = async () => {
    if (!scrollRef.current) return;
    if (scrollRef.current.scrollTop < 30) {
      loadMoreMessages();
    }
  };

  const handleWheel = (e) => {
    if (e.deltaY < 0 && scrollRef.current && scrollRef.current.scrollTop === 0) {
      loadMoreMessages();
    }
  };

  function handleTyping() {
    const s = getSocket();
    if (!s) return;
    s.emit('typing', { conversationId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      s.emit('typing', { conversationId, isTyping: false });
    }, 2000);
  }

  async function handleSend(e) {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    if (!conversationId) return alert('Select a conversation');

    // Optimistic UI update
    const nonce = Date.now().toString() + Math.random().toString().slice(2);
    const optimisticMsg = {
      _id: 'temp-' + nonce,
      text: text,
      conversationId,
      sender: user,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      nonce: nonce
    };
    addMessage(optimisticMsg);
    setText('');

    // Scroll to bottom immediately
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 0);

    const s = getSocket();
    if (s) {
      s.emit('send_message', { conversationId, text, nonce });
      s.emit('typing', { conversationId, isTyping: false });
    } else {
      try {
        await axios.post('http://localhost:4000/messages', { conversationId, text }, { headers: { Authorization: 'Bearer ' + token } });
      } catch (e) { }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChange(e) {
    setText(e.target.value);
    handleTyping();
  }

  // Helper to format time
  function formatTime(createdAt) {
    const d = new Date(createdAt);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="chat-room-container">
      <div className="messages-list" ref={scrollRef} onScroll={handleScroll} onWheel={handleWheel}>
        {messages.length === 0 && (
          <div className="empty-chat-state">
            <div className="empty-icon">💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((m, i) => {
          // user (prop) is the current user object. user._id is the ID.
          // Normalize sender ID:
          const senderId = typeof m.sender === 'object' ? (m.sender?._id || m.sender?.id) : m.sender;
          const myId = user?._id || user?.id;

          // DEBUG LOG
          // console.log('Msg:', m.text, 'Sender:', senderId, 'Me:', myId, 'isMe:', String(senderId) === String(myId));

          const isMe = String(senderId) === String(myId);

          // Show avatar if previous message was different sender OR is first message
          const prevM = messages[i - 1];
          const prevSenderId = prevM ? (typeof prevM.sender === 'object' ? (prevM.sender?._id || prevM.sender?.id) : prevM.sender) : null;
          const showAvatar = !isMe && (i === 0 || String(prevSenderId) !== String(senderId));

          return (
            <div key={m._id || i} className={`message-row ${isMe ? 'me' : 'other'}`}>
              {!isMe && (
                <div className="message-avatar" style={{ width: 40, marginRight: 8, flexShrink: 0 }}>
                  {showAvatar ? (
                    <div className="avatar small" style={{ width: 36, height: 36 }}>
                      {(typeof m.sender === 'object' ? m.sender?.username : 'U').slice(0, 1).toUpperCase()}
                    </div>
                  ) : <div style={{ width: 36 }} />}
                </div>
              )}
              <div className="message-bubble">
                {!isMe && showAvatar && <div className="message-sender-name" style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{typeof m.sender === 'object' ? (m.sender.displayName || m.sender.username) : 'User'}</div>}

                {/* Content Render based on Type */}
                {m.type === 'text' && <div className="message-text">{m.text}</div>}
                {m.type === 'image' && m.attachments?.[0] && <img src={`http://localhost:4000${m.attachments[0].url}`} className="message-image" onClick={() => window.open(`http://localhost:4000${m.attachments[0].url}`, '_blank')} />}
                {m.type === 'video' && m.attachments?.[0] && <video src={`http://localhost:4000${m.attachments[0].url}`} controls className="message-video" />}
                {m.type === 'audio' && m.attachments?.[0] && <audio src={`http://localhost:4000${m.attachments[0].url}`} controls className="message-audio" />}
                {m.type === 'file' && m.attachments?.[0] && (
                  <a href={`http://localhost:4000${m.attachments[0].url}`} target="_blank" className="message-file-link">
                    📄 {m.attachments[0].name || 'Attached File'}
                  </a>
                )}

                <div className="message-time" style={{ fontSize: 9, opacity: 0.5, textAlign: 'right', marginTop: 4 }}>{formatTime(m.createdAt || new Date())}</div>
              </div>
            </div>
          )
        })}
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="message-row other">
            <div className="message-avatar">
              <div className="avatar small" style={{ animation: 'pulse 1s infinite' }}>...</div>
            </div>
            <div className="message-bubble typing-bubble">
              <div className="typing-dots">
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        {isRecording ? (
          <div className="recording-ui">
            <span>🔴 Recording...</span>
            <button className="btn-icon-simple" onClick={stopRecording}>⏹️ Stop & Send</button>
          </div>
        ) : (
          <div className="chat-input-controls">
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            <button className="btn-icon-simple" title="Attach file" onClick={() => fileInputRef.current?.click()}>📎</button>
            <button className="btn-icon-simple" title="Record Voice" onClick={startRecording}>🎤</button>

            <form style={{ flex: 1, display: 'flex', gap: 10 }} onSubmit={handleSend}>
              <input
                className="chat-input"
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${user?.displayName || '...'}`}
              />
              <button type="submit" className="btn-icon send-btn">
                ➢
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
