import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token, opts = {}){
  if(socket) return socket;
  socket = io(opts.url || 'http://localhost:4000', { auth: { token } });
  return socket;
}

export function getSocket(){
  return socket;
}

export function disconnectSocket(){
  if(socket) socket.disconnect();
  socket = null;
}
