import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import healthHandler from './api/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.get(['/api/health.js', '/api/health'], (req, res) => {
  return healthHandler(req, res);
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SG Air production server listening on port ${PORT}`);
});
