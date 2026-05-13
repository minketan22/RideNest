const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDir = path.join(__dirname, '..', 'frontend');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(frontendDir));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/bookings', require('./routes/bookings'));

app.get('/api', (req, res) => {
  res.json({
    message: 'RideNest API is running',
    demoAccounts: {
      user: {
        email: 'user@ridenest.demo',
        password: 'demo12345'
      },
      agency: {
        email: 'agency@ridenest.demo',
        password: 'demo12345'
      }
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`RideNest is running on http://localhost:${PORT}`);
});
