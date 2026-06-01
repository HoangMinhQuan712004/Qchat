import { API_URL } from './config';
import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token, opts = {}){
  if(socket) return socket;
  socket = io(opts.url || `${API_URL}`, { auth: { token } });
  return socket;
}

export function getSocket(){
  return socket;
}

export function disconnectSocket(){
  if(socket) socket.disconnect();
  socket = null;
}
