require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs'); // ✅ File system module to save transactions

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simple test route
app.get('/', (req, res) => {
  res.send('Flutterwave backend running');
});

// 🔒 Save payment to local file
function savePayment(data) {
  const filePath = 'payments.json';
  const existingData = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath))
    : [];

  existingData.push(data);
  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
}

// 💳 Route to initialize payment
app.post('/api/pay', async (req, res) => {
  const { name, email, amount } = req.body;

  if (!name || !email || !amount) {
    return res.status(400).json({ error: 'Please provide name, email, and amount' });
  }

  try {
    const tx_ref = 'TX-' + Date.now();

    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref,
        amount,
        currency: 'GHS',
        redirect_url: 'http://localhost:3000/payment-callback.html',
        customer: { email, name },
        customizations: {
          title: 'Wallet Top-Up',
          description: 'Top-up your wallet balance',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // 📝 Save payment details to file
    const paymentData = {
      name,
      email,
      amount,
      tx_ref,
      paymentLink: response.data.data.link,
      createdAt: new Date().toISOString(),
    };

    savePayment(paymentData);

    res.json({ paymentLink: paymentData.paymentLink });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});