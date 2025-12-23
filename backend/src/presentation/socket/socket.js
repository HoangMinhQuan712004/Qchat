const { Server } = require('socket.io');
const socketJwtMiddleware = require('../../infrastructure/middleware/socketAuth');
const Message = require('../../infrastructure/models/message');
const Conversation = require('../../infrastructure/models/conversation');
const User = require('../../infrastructure/models/user');
const Notification = require('../../infrastructure/models/notification');

let io;

function setupSocket(server) {
  io = new Server(server, { cors: { origin: '*' } });

  // authenticate sockets
  io.use((socket, next) => socketJwtMiddleware(socket, next));

  io.on('connection', async (socket) => {
    const user = socket.user; // injected by middleware
    if (!user) return socket.disconnect(true);

    // Join user-specific room for notifications
    socket.join(String(user.id));

    // Mark user online
    await User.findByIdAndUpdate(user.id, { isOnline: true, lastSeenAt: new Date() });
    io.emit('user_connected', { userId: user.id });

    socket.on('join_room', async ({ conversationId }) => {
      socket.join(String(conversationId));
    });

    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(String(conversationId)).emit('typing', { conversationId, userId: user.id, isTyping });
    });

    socket.on('send_message', async (payload) => {
      // payload: { conversationId, type, text, attachments, nonce }
      const msg = await Message.create({ conversationId: payload.conversationId, sender: user.id, type: payload.type || 'text', text: payload.text, attachments: payload.attachments || [] });
      // update conversation lastMessageAt
      await Conversation.findByIdAndUpdate(payload.conversationId, { lastMessageAt: new Date() });

      const populated = await msg.populate('sender', 'username displayName avatarUrl');

      // Convert to object to attach transient nonce if provided
      const msgObj = populated.toObject ? populated.toObject() : populated;
      if (payload.nonce) msgObj.nonce = payload.nonce;

      io.to(String(payload.conversationId)).emit('new_message', { message: msgObj });

      // Send notification to other members
      try {
        const convo = await Conversation.findById(payload.conversationId);
        if (convo && convo.members) {
          const notifDocs = [];
          convo.members.forEach(memberId => {
            if (String(memberId) !== String(user.id)) {
              let displayMsg = msgObj.text || '';
              if (msgObj.type === 'image') displayMsg = '📷 ' + (msgObj.text || 'Hình ảnh');
              else if (msgObj.type === 'file') displayMsg = '📁 ' + (msgObj.text || 'Tệp tin');
              else if (msgObj.type === 'video') displayMsg = '🎥 ' + (msgObj.text || 'Video');
              else if (msgObj.type === 'audio') displayMsg = '🎵 ' + (msgObj.text || 'Tin nhắn âm thanh');

              notifDocs.push({
                user: memberId,
                type: 'message',
                title: `Tin nhắn mới từ ${msgObj.sender.displayName || msgObj.sender.username}`,
                message: displayMsg,
                relatedId: payload.conversationId
              });
            }
          });

          if (notifDocs.length > 0) {
            const savedNotifs = await Notification.insertMany(notifDocs);

            // Thông báo thời gian thực cho từng người nhận
            savedNotifs.forEach(n => {
              io.to(String(n.user)).emit('message_notification', {
                notification: n,
                // Giữ lại các trường cũ để tương thích với Toast (nếu cần)
                message: n.message,
                senderName: msgObj.sender.displayName || msgObj.sender.username,
                conversationId: payload.conversationId
              });
            });
          }
        }
      } catch (err) {
        console.error('Error sending notification:', err);
      }
    });

    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(user.id, { isOnline: false, lastSeenAt: new Date() });
      io.emit('user_disconnected', { userId: user.id });
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

module.exports = { setupSocket, getIO };
