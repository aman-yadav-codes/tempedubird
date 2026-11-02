const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const secret = process.env.JWT_SECRET || 'secret';
const token = jwt.sign({ sub: '81', id: 81, typ: 'access' }, secret, { expiresIn: '1h' });

const payload = {
  salary_account: {
    payment_mode: "BANK_TRANSFER",
    account_type: "SAVINGS",
    bank_name: "SBI",
    account_holder_name: "Ram",
    account_number: "4343534434343434",
    ifsc_code: "SBIN0093",
    branch_name: "mumbai",
    upi_id: "",
    pan_number: "SDWW434RW",
    uan_number: "",
    esi_number: "",
  },
  salary_notes: "asdaasassssa",
};

fetch('http://localhost:3000/api/admin/users/88', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(payload)
})
  .then(async res => {
    console.log('Status:', res.status, res.statusText);
    const json = await res.json().catch(err => ({ parseError: err.message }));
    console.log('Response body:', json);
  })
  .catch(err => console.error('Fetch error:', err.message));
