import axios from 'axios';

// Cliente Axios apuntando al backend local (nunca a SISPRO directamente)
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── PROCESOS (CRUD local) ────────────────────────────────────
export const getProcesos = () =>
  api.get('/procesos').then(r => r.data);

export const getProceso = (id: number) =>
  api.get(`/procesos/${id}`).then(r => r.data);

// ── WIZARD — los 5 pasos ─────────────────────────────────────
export const wizardToken = (body: { nit: string; tokenBase: string }) =>
  api.post('/wizard/token', body).then(r => r.data);

export const wizardVerificarDireccionamiento = (id: number, body: object) =>
  api.post(`/wizard/${id}/verificar-direccionamiento`, body).then(r => r.data);

export const wizardProgramacion = (id: number, body: object) =>
  api.put(`/wizard/${id}/programacion`, body).then(r => r.data);

export const wizardEntrega = (id: number, body: object) =>
  api.put(`/wizard/${id}/entrega`, body).then(r => r.data);

export const wizardReporte = (id: number, body: object) =>
  api.put(`/wizard/${id}/reporte`, body).then(r => r.data);

export default api;
