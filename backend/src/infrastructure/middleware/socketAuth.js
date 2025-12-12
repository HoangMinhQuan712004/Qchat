const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'change_this_secret';

function socketJwtMiddleware(socket, next){
  // Accept token via handshake auth (socket.client sends { auth: { token } })
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if(!token) return next(new Error('Missing token'));
  try{
    const payload = jwt.verify(token, secret);
    socket.user = payload;
    next();
  }catch(err){
    next(new Error('Invalid token'));
  }
}

module.exports = socketJwtMiddleware;
