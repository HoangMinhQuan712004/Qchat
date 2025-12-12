const { Server } = require('socket.io');
const socketJwtMiddleware = require('../../infrastructure/middleware/socketAuth');
const Message = require('../../infrastructure/models/message');
const Conversation = require('../../infrastructure/models/conversation');
const User = require('../../infrastructure/models/user');

function setupSocket(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  // authenticate sockets
  io.use((socket, next) => socketJwtMiddleware(socket, next));

  io.on('connection', async (socket) => {
    const user = socket.user; // injected by middleware
    if (!user) return socket.disconnect(true);

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
    });

    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(user.id, { isOnline: false, lastSeenAt: new Date() });
      io.emit('user_disconnected', { userId: user.id });
    });
  });

  return io;
}

module.exports = { setupSocket };
