import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { handler as spektrHandler } from './spektr.ts';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.post('/api/spektr', async (req, res) => {
  // Adaptar la solicitud y respuesta de Express al formato de Vercel Serverless
  const vercelReq = {
    method: req.method,
    body: req.body,
  };
  const vercelRes = {
    setHeader: (name: string, value: string | string[]) => res.setHeader(name, value),
    status: (statusCode: number) => {
      res.status(statusCode);
      return vercelRes; // Para encadenar .status().json()
    },
    json: (body: any) => res.json(body),
  };

  await spektrHandler(vercelReq as any, vercelRes as any);
});

app.listen(PORT, () => {
  console.log(`Local SPEKTR API server running on http://localhost:${PORT}`);
});
