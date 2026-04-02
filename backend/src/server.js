import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { testConnection, runMigrations } from './db/connection.js';
import procesosRouter from './routes/procesos.js';
import wizardRouter   from './routes/wizard.js';
import batchRouter    from './routes/batch.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares ────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://3.137.155.77',
    'http://3.137.155.77:5173',
    'http://3.137.155.77:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── Health check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Servidor MIPRES funcionando ✅' });
});

// ── Rutas ──────────────────────────────────────────────────
app.use('/api/procesos', procesosRouter);
app.use('/api/wizard',   wizardRouter);
app.use('/api/batch',    batchRouter);

// ── Arranque del servidor ───────────────────────────────────
async function start() {
  await testConnection();    // Verifica DB antes de abrir el puerto
  await runMigrations();     // Crea tablas si no existen
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
  });
}

start();
