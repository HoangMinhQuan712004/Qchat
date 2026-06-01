const { Server } = require('socket.io');
const socketJwtMiddleware = require('../../infrastructure/middleware/socketAuth');
const Message = require('../../infrastructure/models/message');
const Conversation = require('../../infrastructure/models/conversation');
const User = require('../../infrastructure/models/user');
const Notification = require('../../infrastructure/models/notification');

let io;

// Theo dõi số socket đang mở của mỗi user để tránh race condition khi mở nhiều tab
// userId (string) -> số lượng socket đang kết nối
const userSocketCount = new Map();

// Rate limiter đơn giản cho send_message: userId -> { count, resetAt }
const msgRateMap = new Map();
const MSG_RATE_MAX = 20; // 20 tin nhắn
const MSG_RATE_WINDOW = 10 * 1000; // mỗi 10 giây

function checkMsgRate(userId) {
  const now = Date.now();
  const entry = msgRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    msgRateMap.set(userId, { count: 1, resetAt: now + MSG_RATE_WINDOW });
    return true;
  }
  if (entry.count >= MSG_RATE_MAX) return false;
  entry.count++;
  return true;
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');

function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  io.use((socket, next) => socketJwtMiddleware(socket, next));

  io.on('connection', async (socket) => {
    const user = socket.user;
    if (!user) return socket.disconnect(true);

    const userId = String(user.id);
    socket.join(userId);

    // Tăng đếm socket; chỉ emit online khi là socket ĐẦU TIÊN
    const prevCount = userSocketCount.get(userId) || 0;
    userSocketCount.set(userId, prevCount + 1);
    if (prevCount === 0) {
      await User.findByIdAndUpdate(user.id, { isOnline: true, lastSeenAt: new Date() });
      io.emit('user_connected', { userId });
    }

    socket.on('join_room', ({ conversationId }) => {
      if (conversationId) socket.join(String(conversationId));
    });

    socket.on('typing', ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(String(conversationId)).emit('typing', { conversationId, userId, isTyping });
    });

    socket.on('send_message', async (payload) => {
      if (!payload?.conversationId) return;

      // Rate limit
      if (!checkMsgRate(userId)) {
        socket.emit('error', { message: 'Gửi quá nhanh, vui lòng thử lại sau' });
        return;
      }

      try {
        // Kiểm tra user có trong conversation không
        const convo = await Conversation.findOne({
          _id: payload.conversationId,
          members: user.id,
        }).lean();
        if (!convo) {
          socket.emit('error', { message: 'Không có quyền gửi tin nhắn vào cuộc trò chuyện này' });
          return;
        }

        const text = typeof payload.text === 'string' ? payload.text.slice(0, 10000) : '';
        const attachments = Array.isArray(payload.attachments) ? payload.attachments.slice(0, 10) : [];

        const msg = await Message.create({
          conversationId: payload.conversationId,
          sender: user.id,
          type: payload.type || 'text',
          text,
          attachments,
          replyTo: payload.replyTo || null,
        });

        await Conversation.findByIdAndUpdate(payload.conversationId, { lastMessageAt: new Date() });

        await msg.populate('sender', 'username displayName avatarUrl');
        await msg.populate('replyTo', 'text sender type attachments');
        const msgObj = msg.toObject();
        if (payload.nonce) msgObj.nonce = payload.nonce;

        io.to(String(payload.conversationId)).emit('new_message', { message: msgObj });

        // Thông báo cho các thành viên khác (không lưu DB nếu nhóm lớn để tránh spam)
        const otherMembers = convo.members.filter(m => String(m) !== userId);
        if (otherMembers.length > 0 && otherMembers.length <= 100) {
          let displayMsg = text;
          if (msgObj.type === 'image') displayMsg = 'Hình ảnh';
          else if (msgObj.type === 'file') displayMsg = 'Tệp tin';
          else if (msgObj.type === 'video') displayMsg = 'Video';
          else if (msgObj.type === 'audio') displayMsg = 'Tin nhắn âm thanh';

          const senderName = msgObj.sender.displayName || msgObj.sender.username;
          const notifDocs = otherMembers.map(memberId => ({
            user: memberId,
            type: 'message',
            title: `Tin nhắn mới từ ${senderName}`,
            message: displayMsg,
            relatedId: payload.conversationId,
          }));

          const savedNotifs = await Notification.insertMany(notifDocs);
          savedNotifs.forEach(n => {
            io.to(String(n.user)).emit('message_notification', {
              notification: n,
              message: n.message,
              senderName,
              conversationId: payload.conversationId,
            });
          });
        }
      } catch (err) {
        console.error('[socket] send_message error:', err.message);
        socket.emit('error', { message: 'Gửi tin nhắn thất bại' });
      }
    });

    socket.on('disconnect', async () => {
      const currentCount = Math.max(0, (userSocketCount.get(userId) || 1) - 1);
      if (currentCount === 0) {
        userSocketCount.delete(userId);
        await User.findByIdAndUpdate(user.id, { isOnline: false, lastSeenAt: new Date() });
        io.emit('user_disconnected', { userId });
      } else {
        userSocketCount.set(userId, currentCount);
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io chưa được khởi tạo');
  return io;
}

module.exports = { setupSocket, getIO };
