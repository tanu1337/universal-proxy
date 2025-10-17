const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');

const app = express();

// Base URL and Port
const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT || 8080;

// Enable CORS
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

// Universal proxy route (streaming)
app.all('*', async (req, res) => {
  const targetUrl = `${BASE_URL}${req.originalUrl}`;

  try {
    const safeHeaders = Object.fromEntries(
      Object.entries(req.headers).filter(
        ([k]) => !['host', 'content-length', 'content-encoding', 'connection'].includes(k.toLowerCase())
      )
    );

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: safeHeaders,
      data: req.body,
      responseType: 'stream',
      validateStatus: () => true,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    });

    for (const [k, v] of Object.entries(response.headers)) res.setHeader(k, v);
    res.status(response.status);
    response.data.pipe(res);

  } catch (err) {
    res.status(err.response?.status || 500).json({
      status: false,
      message: 'Proxy error',
      detail: err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🌐 Universal Proxy running on port ${PORT}`);
  console.log(`➡️  Forwarding all requests to: ${BASE_URL}`);
});
