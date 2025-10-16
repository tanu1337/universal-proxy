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

// Universal proxy route
app.all('*', async (req, res) => {
  const targetUrl = `${BASE_URL}${req.originalUrl}`;
  console.log(`[${req.method}] → ${targetUrl}`);

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: { ...req.headers, host: undefined },
      data: req.body,
      timeout: 60000,
      responseType: 'arraybuffer',
      validateStatus: () => true
    });

    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }

    res.status(response.status).send(Buffer.from(response.data));
  } catch (err) {
    console.error('Proxy Error:', err.message);
    res.status(err.response?.status || 500).json({
      status: false,
      message: 'Proxy error',
      detail: err.message
    });
  }
});

// Health check
app.get('/', (_, res) => {
  res.json({
    status: true,
    message: 'Universal Proxy running',
    forwarding: BASE_URL
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Universal Proxy running on port ${PORT}`);
  console.log(`Forwarding all requests to: ${BASE_URL}`);
});
