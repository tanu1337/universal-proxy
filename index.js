const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Base URL and Port
const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT || 8080;

// Enable CORS for all
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// Accept any body (binary-safe)
app.use(bodyParser.raw({ type: '*/*', limit: '100mb' }));

// Health check
app.get('/health', (_, res) => {
  res.json({
    status: true,
    message: 'Universal Proxy running',
    forwarding: BASE_URL
  });
});

// 🔍 Universal proxy route
app.all('*', async (req, res) => {
  const targetUrl = `${BASE_URL}${req.originalUrl}`;
  console.log(`\n──────────────────────────────────────────────`);
  console.log(`🛰️  [${req.method}] ${targetUrl}`);
  console.log(`──────────────────────────────────────────────`);

  // Log incoming headers
  console.log('📥 Incoming Request Headers:');
  console.table(req.headers);

  try {
    // Prepare outgoing headers (remove Host so axios sets correctly)
    const outgoingHeaders = { ...req.headers, host: undefined };
    console.log('\n📤 Outgoing Request Headers (to target):');
    console.table(outgoingHeaders);

    // Perform the proxy request
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: outgoingHeaders,
      data: req.body,
      timeout: 60000,
      responseType: 'arraybuffer',
      validateStatus: () => true
    });

    // Log response headers
    console.log('\n📦 Response Headers (from target):');
    console.table(response.headers);
    console.log(`\n✅ Response Status: ${response.status}\n`);

    // Forward headers to client
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }

    res.status(response.status).send(Buffer.from(response.data));

  } catch (err) {
    console.error('\n❌ Proxy Error:', err.message);

    res.status(err.response?.status || 500).json({
      status: false,
      message: 'Proxy error',
      detail: err.message,
      stack: err.stack
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🌐 Universal Proxy running on port ${PORT}`);
  console.log(`➡️  Forwarding all requests to: ${BASE_URL}`);
  console.log(`──────────────────────────────────────────────`);
});
