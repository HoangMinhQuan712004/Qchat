import React, { useEffect, useState, useRef } from 'react'
import { getSocket } from '../socketService'
import { useChatStore } from '../stores/useChatStore'
import axios from 'axios'
import { API_URL } from '../config'
import { useToast } from './Toast'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function ChatRoom({ token, conversationId, user, searchQuery }) {
  const { addToast, showConfirm } = useToast()
  const [text, setText] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesStore = useChatStore(s => s.messages);
  const addMessage = useChatStore(s => s.addMessage);

  // New feature states
  const [replyToMsg, setReplyToMsg] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState(null);

  // Filter messages based on search query and sort ASC
  const messages = (searchQuery
    ? messagesStore.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messagesStore).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const prependMessages = useChatStore(s => s.prependMessages) || ((newMsgs) => useChatStore.setState(state => ({ messages: [...newMsgs, ...state.messages] })));

  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

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
      const res = await axios.post(`${API_URL}/upload`, formData, tokenHeader);
      const { url, mimetype, filename } = res.data;

      let type = 'file';
      if (mimetype.startsWith('image/')) type = 'image';
      else if (mimetype.startsWith('video/')) type = 'video';
      else if (mimetype.startsWith('audio/')) type = 'audio';

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
      addToast('Upload thất bại', 'error');
    }
    e.target.value = null;
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
          const res = await axios.post(`${API_URL}/upload`, formData, tokenHeader);
          getSocket().emit('send_message', { conversationId, text: '', type: 'audio', attachments: [{ url: res.data.url, name: 'Voice Message' }] });
        } catch (e) { console.error(e); }
        stream.getTracks().forEach(t => t.stop());
      };

      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      addToast('Không có quyền truy cập microphone', 'error');
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

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const onNew = ({ message }) => {
      if (message.conversationId === conversationId) {
        addMessage(message);
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

    const onMessageUpdated = ({ message }) => {
      if (!message) return;
      useChatStore.setState(state => ({
        messages: state.messages.map(m =>
          m._id === message._id ? { ...m, ...message } : m
        )
      }));
    };

    const onMessageDeleted = ({ messageId }) => {
      if (!messageId) return;
      useChatStore.setState(state => ({
        messages: state.messages.map(m =>
          m._id === messageId ? { ...m, deleted: true, text: '' } : m
        )
      }));
    };

    const onMessageReacted = ({ messageId, reactions }) => {
      if (!messageId) return;
      useChatStore.setState(state => ({
        messages: state.messages.map(m =>
          m._id === messageId ? { ...m, reactions } : m
        )
      }));
    };

    s.on('new_message', onNew);
    s.on('typing', onTyping);
    s.on('message_updated', onMessageUpdated);
    s.on('message_deleted', onMessageDeleted);
    s.on('message_reacted', onMessageReacted);

    return () => {
      s.off('new_message', onNew);
      s.off('typing', onTyping);
      s.off('message_updated', onMessageUpdated);
      s.off('message_deleted', onMessageDeleted);
      s.off('message_reacted', onMessageReacted);
    };
  }, [addMessage, conversationId]);

  // ── Load conversation + mark as read ─────────────────────────────────────
  useEffect(() => {
    setTypingUsers(new Set());
    setHasMore(true);
    setReplyToMsg(null);
    setEditingMsgId(null);

    async function join() {
      if (!conversationId) return;
      try {
        const tokenHeader = token ? { headers: { Authorization: 'Bearer ' + token } } : {};
        const res = await axios.get(`${API_URL}/messages/${conversationId}?limit=6`, tokenHeader);

        useChatStore.setState({ messages: res.data.messages });

        if (res.data.messages.length < 6) setHasMore(false);

        const s = getSocket();
        if (s) s.emit('join_room', { conversationId });

        // Mark messages + notifications as read
        try {
          await axios.put(`${API_URL}/messages/${conversationId}/read`, {}, tokenHeader);
          await axios.put(`${API_URL}/notifications/read-by-conversation/${conversationId}`, {}, tokenHeader);
          window.dispatchEvent(new Event('conversation_read'));
        } catch (_) { /* non-critical */ }

        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 0);

      } catch (err) {
        console.warn('Failed to load messages', err.message);
      }
    }
    join();
  }, [conversationId, token]);

  // ── Scroll restoration on prepend ────────────────────────────────────────
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

    if (scrollRef.current) {
      prevScrollHeightRef.current = scrollRef.current.scrollHeight;
    }

    try {
      const firstMsg = messages[0];
      if (!firstMsg) { setIsLoadingMore(false); return; }

      const tokenHeader = token ? { headers: { Authorization: 'Bearer ' + token } } : {};
      const res = await axios.get(`${API_URL}/messages/${conversationId}?limit=6&before=${firstMsg.createdAt}`, tokenHeader);

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

  const handleScroll = () => {
    if (!scrollRef.current) return;
    if (scrollRef.current.scrollTop < 30) loadMoreMessages();
  };

  const handleWheel = (e) => {
    if (e.deltaY < 0 && scrollRef.current && scrollRef.current.scrollTop === 0) {
      loadMoreMessages();
    }
  };

  // ── Typing indicator ──────────────────────────────────────────────────────
  function handleTyping() {
    const s = getSocket();
    if (!s) return;
    s.emit('typing', { conversationId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      s.emit('typing', { conversationId, isTyping: false });
    }, 2000);
  }

  // ── Send / Edit ───────────────────────────────────────────────────────────
  async function handleSend(e) {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    if (!conversationId) return addToast('Chọn một cuộc trò chuyện trước', 'warning');

    // Handle edit mode
    if (editingMsgId) {
      try {
        const tokenHeader = token ? { headers: { Authorization: 'Bearer ' + token } } : {};
        const res = await axios.put(`${API_URL}/messages/${editingMsgId}`, { text }, tokenHeader);
        useChatStore.setState(state => ({
          messages: state.messages.map(m =>
            m._id === editingMsgId ? { ...m, text, edited: true } : m
          )
        }));
      } catch (err) {
        console.error('Edit failed', err);
        addToast('Không thể chỉnh sửa tin nhắn', 'error');
      }
      setEditingMsgId(null);
      setText('');
      return;
    }

    // Optimistic UI
    const nonce = Date.now().toString() + Math.random().toString().slice(2);
    const optimisticMsg = {
      _id: 'temp-' + nonce,
      text: text,
      type: 'text',
      conversationId,
      sender: user,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      nonce: nonce,
      replyTo: replyToMsg ? { _id: replyToMsg._id, text: replyToMsg.text, sender: replyToMsg.sender } : undefined
    };
    addMessage(optimisticMsg);
    const sentText = text;
    const sentReplyTo = replyToMsg;
    setText('');
    setReplyToMsg(null);

    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 0);

    const s = getSocket();
    if (s) {
      s.emit('send_message', {
        conversationId,
        text: sentText,
        nonce,
        replyTo: sentReplyTo ? sentReplyTo._id : undefined
      });
      s.emit('typing', { conversationId, isTyping: false });
    } else {
      try {
        await axios.post(
          `${API_URL}/messages`,
          { conversationId, text: sentText, replyTo: sentReplyTo ? sentReplyTo._id : undefined },
          { headers: { Authorization: 'Bearer ' + token } }
        );
      } catch (err) { console.error(err); }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      if (editingMsgId) { setEditingMsgId(null); setText(''); }
      if (replyToMsg) setReplyToMsg(null);
    }
  }

  function handleChange(e) {
    setText(e.target.value);
    handleTyping();
  }

  // ── Emoji reaction ────────────────────────────────────────────────────────
  const handleReact = async (msgId, emoji) => {
    setEmojiPickerMsgId(null);
    try {
      const tokenHeader = token ? { headers: { Authorization: 'Bearer ' + token } } : {};
      const res = await axios.post(`${API_URL}/messages/${msgId}/react`, { emoji }, tokenHeader);
      // Update local reactions if server returns them
      if (res.data && res.data.reactions) {
        useChatStore.setState(state => ({
          messages: state.messages.map(m =>
            m._id === msgId ? { ...m, reactions: res.data.reactions } : m
          )
        }));
      }
    } catch (err) {
      console.error('React failed', err);
    }
  };

  // ── Delete message ────────────────────────────────────────────────────────
  const handleDelete = async (msgId) => {
    const ok = await showConfirm('Xóa tin nhắn này?', { confirmText: 'Xóa', danger: true });
    if (!ok) return;
    try {
      const tokenHeader = token ? { headers: { Authorization: 'Bearer ' + token } } : {};
      await axios.delete(`${API_URL}/messages/${msgId}`, tokenHeader);
      useChatStore.setState(state => ({
        messages: state.messages.map(m =>
          m._id === msgId ? { ...m, deleted: true, text: '' } : m
        )
      }));
    } catch (err) {
      console.error('Delete failed', err);
      addToast('Không thể xóa tin nhắn', 'error');
    }
  };

  // ── Start editing ─────────────────────────────────────────────────────────
  const handleStartEdit = (msg) => {
    setEditingMsgId(msg._id);
    setText(msg.text || '');
    setReplyToMsg(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // ── Start reply ───────────────────────────────────────────────────────────
  const handleStartReply = (msg) => {
    setReplyToMsg(msg);
    setEditingMsgId(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatTime(createdAt) {
    const d = new Date(createdAt);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function isSameDay(d1, d2) {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
  }

  function isToday(createdAt) {
    const d = new Date(createdAt);
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
  }

  function formatDateSeparator(createdAt) {
    const d = new Date(createdAt);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function getSenderName(sender) {
    if (!sender) return 'User';
    if (typeof sender === 'object') return sender.displayName || sender.username || 'User';
    return 'User';
  }

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setEmojiPickerMsgId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
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
          const prevM = messages[i - 1];
          const showDateSeparator = !prevM || !isSameDay(m.createdAt, prevM.createdAt);
          const dateLabel = isToday(m.createdAt) ? null : formatDateSeparator(m.createdAt);

          const senderId = typeof m.sender === 'object' ? (m.sender?._id || m.sender?.id) : m.sender;
          const myId = user?._id || user?.id;
          const isMe = String(senderId) === String(myId);

          const prevSenderId = prevM
            ? (typeof prevM.sender === 'object' ? (prevM.sender?._id || prevM.sender?.id) : prevM.sender)
            : null;
          const showAvatar = !isMe && (i === 0 || String(prevSenderId) !== String(senderId));

          const isHovered = hoveredMsgId === m._id;
          const showEmojiPicker = emojiPickerMsgId === m._id;

          // Aggregate reactions: { emoji: count }
          const reactionMap = {};
          if (m.reactions && Array.isArray(m.reactions)) {
            m.reactions.forEach(r => {
              const emoji = typeof r === 'object' ? r.emoji : r;
              if (emoji) reactionMap[emoji] = (reactionMap[emoji] || 0) + 1;
            });
          }
          const reactionEntries = Object.entries(reactionMap);

          return (
            <React.Fragment key={m._id || i}>
              {showDateSeparator && dateLabel && (
                <div className="date-separator">
                  <span>{dateLabel}</span>
                </div>
              )}

              <div
                className={`message-row ${isMe ? 'me' : 'other'}`}
                onMouseEnter={() => setHoveredMsgId(m._id)}
                onMouseLeave={() => { setHoveredMsgId(null); }}
              >
                {/* Avatar (other users) */}
                {!isMe && (
                  <div className="message-avatar" style={{ width: 40, marginRight: 8, flexShrink: 0 }}>
                    {showAvatar ? (
                      <div className="avatar small" style={{ width: 36, height: 36 }}>
                        {getSenderName(m.sender).slice(0, 1).toUpperCase()}
                      </div>
                    ) : <div style={{ width: 36 }} />}
                  </div>
                )}

                {/* Bubble + Actions wrapper */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>

                  {/* Action bar — shown on hover, above the bubble */}
                  {isHovered && !m.deleted && (
                    <div className={`message-actions ${isMe ? 'actions-me' : 'actions-other'}`}>
                      {/* React */}
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          className="message-action-btn"
                          title="React"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEmojiPickerMsgId(prev => prev === m._id ? null : m._id);
                          }}
                        >
                          😊
                        </button>
                        {showEmojiPicker && (
                          <div
                            className="emoji-picker-wrapper"
                            onClick={e => e.stopPropagation()}
                          >
                            {QUICK_EMOJIS.map(emoji => (
                              <button
                                key={emoji}
                                className="emoji-option-btn"
                                onClick={() => handleReact(m._id, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reply */}
                      <button
                        className="message-action-btn"
                        title="Reply"
                        onClick={() => handleStartReply(m)}
                      >
                        ↩️
                      </button>

                      {/* Edit — own messages only */}
                      {isMe && m.type === 'text' && (
                        <button
                          className="message-action-btn"
                          title="Edit"
                          onClick={() => handleStartEdit(m)}
                        >
                          ✏️
                        </button>
                      )}

                      {/* Delete — own messages only */}
                      {isMe && (
                        <button
                          className="message-action-btn"
                          title="Delete"
                          onClick={() => handleDelete(m._id)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className="message-bubble">
                    {!isMe && showAvatar && (
                      <div className="message-sender-name" style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>
                        {getSenderName(m.sender)}
                      </div>
                    )}

                    {/* Reply preview inside bubble */}
                    {m.replyTo && !m.deleted && (
                      <div className="message-reply-preview">
                        <span className="reply-preview-name">
                          {getSenderName(m.replyTo.sender)}
                        </span>
                        <span className="reply-preview-text">
                          {m.replyTo.text ? (m.replyTo.text.length > 60 ? m.replyTo.text.slice(0, 60) + '…' : m.replyTo.text) : '📎 Attachment'}
                        </span>
                      </div>
                    )}

                    {/* Deleted state */}
                    {m.deleted ? (
                      <div className="message-deleted">
                        <em>Message deleted</em>
                      </div>
                    ) : (
                      <>
                        {m.type === 'text' && <div className="message-text">{m.text}</div>}
                        {m.type === 'image' && m.attachments?.[0] && (
                          <img
                            src={`${API_URL}${m.attachments[0].url}`}
                            className="message-image"
                            onClick={() => window.open(`${API_URL}${m.attachments[0].url}`, '_blank')}
                            alt="attachment"
                          />
                        )}
                        {m.type === 'video' && m.attachments?.[0] && (
                          <video src={`${API_URL}${m.attachments[0].url}`} controls className="message-video" />
                        )}
                        {m.type === 'audio' && m.attachments?.[0] && (
                          <audio src={`${API_URL}${m.attachments[0].url}`} controls className="message-audio" />
                        )}
                        {m.type === 'file' && m.attachments?.[0] && (
                          <a href={`${API_URL}${m.attachments[0].url}`} target="_blank" rel="noreferrer" className="message-file-link">
                            📄 {m.attachments[0].name || 'Attached File'}
                          </a>
                        )}

                        {/* Edited label */}
                        {m.edited && (
                          <span className="message-edited-label" style={{ fontSize: 9, opacity: 0.5, marginLeft: 4 }}>
                            (edited)
                          </span>
                        )}
                      </>
                    )}

                    <div className="message-time" style={{ fontSize: 9, opacity: 0.5, textAlign: 'right', marginTop: 4 }}>
                      {formatTime(m.createdAt || new Date())}
                    </div>
                  </div>

                  {/* Reaction counts */}
                  {reactionEntries.length > 0 && (
                    <div className="message-reactions">
                      {reactionEntries.map(([emoji, count]) => (
                        <button
                          key={emoji}
                          className="reaction-btn"
                          onClick={() => handleReact(m._id, emoji)}
                          title={`${count} reaction${count > 1 ? 's' : ''}`}
                        >
                          {emoji} {count > 1 && <span className="reaction-count">{count}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
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
        {/* Reply preview bar */}
        {replyToMsg && !editingMsgId && (
          <div className="message-reply-bar">
            <div className="reply-bar-content">
              <span className="reply-bar-icon">↩️</span>
              <div className="reply-bar-text">
                <span className="reply-bar-name">{getSenderName(replyToMsg.sender)}</span>
                <span className="reply-bar-preview">
                  {replyToMsg.text
                    ? (replyToMsg.text.length > 80 ? replyToMsg.text.slice(0, 80) + '…' : replyToMsg.text)
                    : '📎 Attachment'}
                </span>
              </div>
            </div>
            <button className="reply-bar-close" onClick={() => setReplyToMsg(null)} title="Cancel reply">✕</button>
          </div>
        )}

        {/* Edit mode indicator */}
        {editingMsgId && (
          <div className="message-reply-bar edit-bar">
            <div className="reply-bar-content">
              <span className="reply-bar-icon">✏️</span>
              <span className="reply-bar-name">Editing message</span>
            </div>
            <button className="reply-bar-close" onClick={() => { setEditingMsgId(null); setText(''); }} title="Cancel edit">✕</button>
          </div>
        )}

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
                ref={inputRef}
                className="chat-input"
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  editingMsgId
                    ? 'Edit message…'
                    : replyToMsg
                      ? `Reply to ${getSenderName(replyToMsg.sender)}…`
                      : `Message ${user?.displayName || '...'}`
                }
              />
              <button type="submit" className="btn-icon send-btn">
                ➢
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
