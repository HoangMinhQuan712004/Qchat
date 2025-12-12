const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'change_this_secret';

function expressJwt(req, res, next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({ message: 'Missing token' });
  const parts = auth.split(' ');
  if(parts.length !== 2) return res.status(401).json({ message: 'Invalid auth header' });
  const token = parts[1];
  try{
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  }catch(err){
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = expressJwt;
