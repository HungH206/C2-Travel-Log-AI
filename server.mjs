import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

// Proxy endpoint for Gemini calls
app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt, responseSchema } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server missing GEMINI_API_KEY' });

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const text = (response?.text ?? '').trim();
    if (!text) return res.status(502).json({ error: 'Empty response from Gemini API' });

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({ error: 'Invalid JSON from Gemini API', raw: text.slice(0, 500) });
    }

    return res.json(json);
  } catch (err) {
    console.error('Server /api/gemini error:', err);
    return res.status(500).json({ error: 'Gemini proxy failed' });
  }
});

// Serve static assets from Vite build
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
