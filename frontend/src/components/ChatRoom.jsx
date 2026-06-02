import React, { useEffect, useState, useRef } from 'react'
import { getSocket } from '../socketService'
import { useChatStore } from '../stores/useChatStore'
import axios from 'axios'
import { API_URL } from '../config'
import { useToast } from './Toast'
import { IconSend, IconPaperclip, IconMic, IconSmile, IconReply, IconEdit, IconTrash, IconX, IconFile, IconMessage, IconCheckCheck, IconCheck, IconImage } from './QIcons'
import EmojiPicker from 'emoji-picker-react'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function ChatRoom({ token, conversationId, user, searchQuery, conversation }) {
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
  const [showInputEmoji, setShowInputEmoji] = useState(false);

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
  const imageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const audioChunksRef = useRef([]);

  // Pending file: { file, previewUrl, type }
  const [pendingFile, setPendingFile] = useState(null);

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    const previewUrl = (type === 'image' || type === 'video') ? URL.createObjectURL(file) : null;
    setPendingFile({ file, previewUrl, type, name: file.name });
    e.target.value = null;
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function removePendingFile() {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
  }

  async function uploadAndSendFile(file, type) {
    const formData = new FormData();
    formData.append('file', file);
    const tokenHeader = token ? { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/form-data' } } : {};
    const res = await axios.post(`${API_URL}/upload`, formData, tokenHeader);
    const { url, filename } = res.data;
    return { url, filename, type };
  }

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

    const onMessagesRead = ({ conversationId: cid, userId: readerId }) => {
      if (cid !== conversationId) return;
      useChatStore.setState(state => ({
        messages: state.messages.map(m =>
          !m.readBy?.includes(readerId)
            ? { ...m, readBy: [...(m.readBy || []), readerId] }
            : m
        )
      }));
    };

    s.on('new_message', onNew);
    s.on('typing', onTyping);
    s.on('message_updated', onMessageUpdated);
    s.on('message_deleted', onMessageDeleted);
    s.on('message_reacted', onMessageReacted);
    s.on('messages_read', onMessagesRead);

    return () => {
      s.off('new_message', onNew);
      s.off('typing', onTyping);
      s.off('message_updated', onMessageUpdated);
      s.off('message_deleted', onMessageDeleted);
      s.off('message_reacted', onMessageReacted);
      s.off('messages_read', onMessagesRead);
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
    if (!text.trim() && !pendingFile) return;
    if (!conversationId) return addToast('Chọn một cuộc trò chuyện trước', 'warning');

    // Send pending file first
    if (pendingFile) {
      const fileToSend = pendingFile;
      removePendingFile();
      try {
        const { url, filename, type } = await uploadAndSendFile(fileToSend.file, fileToSend.type);
        const s = getSocket();
        if (s) {
          s.emit('send_message', { conversationId, text: text.trim() || '', type, attachments: [{ url, name: filename }] });
        }
      } catch (err) {
        addToast('Upload thất bại: ' + (err.message || ''), 'error');
        return;
      }
      setText('');
      setReplyToMsg(null);
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
      return;
    }

    if (!text.trim()) return;

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

  // Close emoji pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setEmojiPickerMsgId(null);
      setShowInputEmoji(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Paste image from clipboard (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e) => {
      if (!conversationId) return;
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(it => it.type.startsWith('image/'));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const previewUrl = URL.createObjectURL(file);
      setPendingFile({ file, previewUrl, type: 'image', name: 'clipboard-image.png' });
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [conversationId]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="chat-room-container">
      <div className="messages-list" ref={scrollRef} onScroll={handleScroll} onWheel={handleWheel}>
        {messages.length === 0 && (
          <div className="empty-chat-state">
            <div className="empty-icon"><IconMessage size={52} /></div>
            <p style={{ fontSize: '0.95rem' }}>No messages yet. Start the conversation!</p>
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
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                {/* Avatar placeholder (other users) */}
                {!isMe && (
                  <div style={{ width: 32, flexShrink: 0, display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                    {showAvatar
                      ? <div className="avatar small" style={{ width: 32, height: 32, borderRadius: 8, fontSize: '0.75rem' }}>{getSenderName(m.sender).slice(0, 1).toUpperCase()}</div>
                      : <div style={{ width: 32 }} />
                    }
                  </div>
                )}

                {/* Bubble column */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>

                  {/* Sender name ABOVE bubble — outside, no wrapping */}
                  {!isMe && showAvatar && (
                    <span className="message-sender-name">
                      {getSenderName(m.sender)}
                    </span>
                  )}

                  {/* Action bar */}
                  {isHovered && !m.deleted && (
                    <div className={`message-actions ${isMe ? 'actions-me' : 'actions-other'}`}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button className="message-action-btn" title="React" onClick={(e) => { e.stopPropagation(); setEmojiPickerMsgId(prev => prev === m._id ? null : m._id); }}>
                          <IconSmile size={15} />
                        </button>
                        {showEmojiPicker && (
                          <div className="emoji-picker-wrapper" onClick={e => e.stopPropagation()}>
                            {QUICK_EMOJIS.map(emoji => (
                              <button key={emoji} className="emoji-option-btn" onClick={() => handleReact(m._id, emoji)}>{emoji}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="message-action-btn" title="Reply" onClick={() => handleStartReply(m)}><IconReply size={15} /></button>
                      {isMe && m.type === 'text' && (
                        <button className="message-action-btn" title="Edit" onClick={() => handleStartEdit(m)}><IconEdit size={15} /></button>
                      )}
                      {isMe && (
                        <button className="message-action-btn danger" title="Delete" onClick={() => handleDelete(m._id)}><IconTrash size={15} /></button>
                      )}
                    </div>
                  )}

                  {/* Bubble — no bg for pure image/video messages */}
                  <div className={`message-bubble${(m.type === 'image' || m.type === 'video') && !m.text && !m.replyTo ? ' bubble-media' : ''}`}>
                    {/* Reply preview */}
                    {m.replyTo && !m.deleted && (
                      <div className="message-reply-preview">
                        <span className="reply-preview-name">{getSenderName(m.replyTo.sender)}</span>
                        <span className="reply-preview-text">
                          {m.replyTo.text ? (m.replyTo.text.length > 60 ? m.replyTo.text.slice(0, 60) + '…' : m.replyTo.text) : 'Attachment'}
                        </span>
                      </div>
                    )}

                    {m.deleted ? (
                      <div className="message-deleted"><em>Tin nhắn đã bị xóa</em></div>
                    ) : (
                      <>
                        {m.type === 'text' && <div className="message-text">{m.text}</div>}
                        {m.type === 'image' && m.attachments?.[0] && (
                          <img src={`${API_URL}${m.attachments[0].url}`} className="message-image"
                            onClick={() => window.open(`${API_URL}${m.attachments[0].url}`, '_blank')} alt="attachment" />
                        )}
                        {m.type === 'video' && m.attachments?.[0] && (
                          <video src={`${API_URL}${m.attachments[0].url}`} controls className="message-video" />
                        )}
                        {m.type === 'audio' && m.attachments?.[0] && (
                          <audio src={`${API_URL}${m.attachments[0].url}`} controls className="message-audio" />
                        )}
                        {m.type === 'file' && m.attachments?.[0] && (
                          <a href={`${API_URL}${m.attachments[0].url}`} target="_blank" rel="noreferrer" className="message-file-link">
                            <IconFile size={14} /> {m.attachments[0].name || 'Attached File'}
                          </a>
                        )}
                        {m.edited && <span style={{ fontSize: 9, opacity: 0.45, marginLeft: 4 }}>(edited)</span>}
                      </>
                    )}

                    {/* Time + tick */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 }}>
                      <span style={{ fontSize: '0.62rem', opacity: 0.5, whiteSpace: 'nowrap' }}>{formatTime(m.createdAt || new Date())}</span>
                      {isMe && !m.deleted && !m.isOptimistic && (
                        <MessageTick readBy={m.readBy || []} members={conversation?.members || []} myId={user?._id} />
                      )}
                    </div>
                  </div>

                  {/* Reactions */}
                  {reactionEntries.length > 0 && (
                    <div className="message-reactions">
                      {reactionEntries.map(([emoji, count]) => (
                        <button key={emoji} className="reaction-btn" onClick={() => handleReact(m._id, emoji)} title={`${count} reaction${count > 1 ? 's' : ''}`}>
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
              <span className="reply-bar-icon"><IconReply size={13} /></span>
              <div className="reply-bar-text" style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span className="reply-bar-name">{getSenderName(replyToMsg.sender)}</span>
                <span className="reply-bar-preview">
                  {replyToMsg.text
                    ? (replyToMsg.text.length > 80 ? replyToMsg.text.slice(0, 80) + '…' : replyToMsg.text)
                    : 'Attachment'}
                </span>
              </div>
            </div>
            <button className="reply-bar-close" onClick={() => setReplyToMsg(null)} title="Cancel reply"><IconX size={13} /></button>
          </div>
        )}

        {/* Edit mode indicator */}
        {editingMsgId && (
          <div className="message-reply-bar edit-bar">
            <div className="reply-bar-content">
              <span className="reply-bar-icon"><IconEdit size={13} /></span>
              <span className="reply-bar-name">Editing message</span>
            </div>
            <button className="reply-bar-close" onClick={() => { setEditingMsgId(null); setText(''); }} title="Cancel edit"><IconX size={13} /></button>
          </div>
        )}

        {isRecording ? (
          <div className="recording-ui">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="dot" /> Recording…</span>
            <button className="btn ghost" style={{ fontSize: '0.8rem', padding: '5px 12px' }} onClick={stopRecording}>Stop & Send</button>
          </div>
        ) : (
          <>
          {/* File preview bar */}
          {pendingFile && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              animation: 'slideDownIn 0.15s ease', position: 'relative',
            }}>
              {/* Image preview — large */}
              {pendingFile.type === 'image' && pendingFile.previewUrl && (
                <div style={{ position: 'relative' }}>
                  <img
                    src={pendingFile.previewUrl}
                    alt="preview"
                    style={{
                      display: 'block', width: '100%',
                      maxHeight: 280, objectFit: 'contain',
                      background: '#000',
                    }}
                  />
                  <button
                    className="btn-icon"
                    onClick={removePendingFile}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.6)', borderRadius: '50%',
                      width: 28, height: 28, color: '#fff',
                    }}
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}

              {/* Video preview */}
              {pendingFile.type === 'video' && pendingFile.previewUrl && (
                <div style={{ position: 'relative' }}>
                  <video src={pendingFile.previewUrl} style={{ display: 'block', width: '100%', maxHeight: 220 }} controls />
                  <button className="btn-icon" onClick={removePendingFile} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: 28, height: 28, color: '#fff' }}>
                    <IconX size={14} />
                  </button>
                </div>
              )}

              {/* File / Audio row */}
              {(pendingFile.type === 'file' || pendingFile.type === 'audio') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconFile size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pendingFile.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Nhấn Gửi để gửi</div>
                  </div>
                  <button className="btn-icon" onClick={removePendingFile}><IconX size={16} /></button>
                </div>
              )}

              {/* Caption hint for image */}
              {pendingFile.type === 'image' && (
                <div style={{ padding: '6px 10px', fontSize: '0.72rem', color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
                  Thêm chú thích… hoặc nhấn Gửi ngay
                </div>
              )}
            </div>
          )}

          <div style={{ position: 'relative' }}>
            {showInputEmoji && (
              <div style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 700, marginBottom: 8 }} onClick={e => e.stopPropagation()}>
                <EmojiPicker
                  onEmojiClick={(e) => { setText(t => t + e.emoji); setShowInputEmoji(false); inputRef.current?.focus(); }}
                  theme="dark"
                  width={320}
                  height={380}
                  searchPlaceholder="Tìm emoji..."
                  skinTonesDisabled
                />
              </div>
            )}
          </div>
          <div className="chat-input-controls">
            {/* File inputs */}
            <input type="file" ref={imageInputRef} accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileSelect} />
            <input type="file" ref={fileInputRef} accept="*/*" style={{ display: 'none' }} onChange={handleFileSelect} />
            <button className="btn-icon-simple" title="Gửi ảnh / video" onClick={() => imageInputRef.current?.click()}><IconImage size={18} /></button>
            <button className="btn-icon-simple" title="Đính kèm file" onClick={() => fileInputRef.current?.click()}><IconPaperclip size={18} /></button>
            <button className="btn-icon-simple" title="Ghi âm" onClick={startRecording}><IconMic size={18} /></button>
            <button
              className="btn-icon-simple"
              title="Emoji"
              onClick={() => setShowInputEmoji(v => !v)}
              style={{ color: showInputEmoji ? 'var(--accent)' : undefined }}
            >
              <IconSmile size={18} />
            </button>

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
            <button type="button" className="send-btn" onClick={handleSend}>
              <IconSend size={16} />
            </button>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

function MessageTick({ readBy, members, myId }) {
  const others = (members || []).filter(id => String(id) !== String(myId))
  const readByOthers = (readBy || []).filter(id => String(id) !== String(myId))
  const allRead = others.length > 0 && readByOthers.length >= others.length

  if (allRead) {
    return <IconCheckCheck size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
  }
  if (readByOthers.length > 0) {
    return <IconCheckCheck size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
  }
  return <IconCheck size={13} style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
}
