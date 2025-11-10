import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Gemini proxy endpoint
app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt, responseSchema } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const text = (response?.text || '').trim();
    if (!text) {
      return res.status(502).json({ error: 'Empty response from Gemini API' });
    }

    // Parse and return JSON
    const result = JSON.parse(text);
    return res.json(result);
  } catch (err) {
    console.error('Gemini proxy error:', err);
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: 'Invalid JSON from Gemini API' });
    }
    return res.status(500).json({ error: (err && err.message) || 'Unknown error' });
  }
});

// Serve built assets
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
