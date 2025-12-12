const mongoose = require('mongoose');

async function connect(){
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp';
  await mongoose.connect(uri, {useNewUrlParser:true, useUnifiedTopology:true});
  console.log('MongoDB connected');
}

module.exports = { connect, mongoose };
