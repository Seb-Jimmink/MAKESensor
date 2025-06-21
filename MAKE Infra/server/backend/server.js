// server.js
const app = require('./app');
require('dotenv').config();

const ip = process.env.API_IP || 'localhost';
const port = process.env.API_PORT || 3000;

app.listen(port, () => {
  console.log(`Backend API listening on http://:${ip}:${port}`);
});
