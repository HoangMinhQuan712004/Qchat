const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { setupSocket } = require('./presentation/socket/socket');
const { connect } = require('./infrastructure/db/mongoose');
const appFactory = require('./presentation/http/app');

dotenv.config();

const PORT = process.env.PORT || 4000;

async function start(){
  await connect();

  const app = appFactory();
  const server = http.createServer(app);

  const io = setupSocket(server);

  server.listen(PORT, ()=>{
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch(err=>{
  console.error('Failed to start', err);
  process.exit(1);
});
