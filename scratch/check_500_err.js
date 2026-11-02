process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: '.env.local' });
const secret = process.env.JWT_SECRET || 'secret';
const token = jwt.sign({ sub: '1', id: 1, email: 'admin@gmail.com', typ: 'access' }, secret, { expiresIn: '1h' });

fetch('http://localhost:3000/api/admin/operations/tasks?institution_id=none', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(d => console.log('Error details:', d))
.catch(e => console.error(e));

