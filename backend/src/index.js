const dotenv = require('dotenv');
dotenv.config();

const http = require('http');
const { setupSocket } = require('./presentation/socket/socket');
const { connect } = require('./infrastructure/db/mongoose');
const appFactory = require('./presentation/http/app');

const PORT = process.env.PORT || 4000;

async function start(){
  await connect();

  const app = appFactory();
  const server = http.createServer(app);

  const io = setupSocket(server);
  app.set('io', io);

  server.listen(PORT, ()=>{
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch(err=>{
  console.error('Failed to start', err);
  process.exit(1);
});
