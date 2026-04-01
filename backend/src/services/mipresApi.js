import 'dotenv/config';
import axios from 'axios';

// Cliente Axios configurado para la API MIPRES
const baseURL = process.env.MIPRES_BASE_URL || 'https://wsmipres.sispro.gov.co/WSSUMMIPRESNOPBS/api';

const mipres = axios.create({
  baseURL,
  timeout: 30000, 
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
});

// ── Interceptor: log de cada llamado (útil para debug) ───────
mipres.interceptors.request.use((config) => {
  console.log(`[MIPRES] → ${config.method?.toUpperCase()} ${config.url}`);
  if (config.data) {
    console.log(`[MIPRES] Payload enviado ->`, JSON.stringify(config.data));
  }
  return config;
});

mipres.interceptors.response.use(
  (res) => {
    console.log(`[MIPRES] ← ${res.status} ${res.config.url}`);
    return res;
  },
  (err) => {
    const status = err.response?.status;
    const url    = err.config?.url;
    const detail = err.response?.data ?? err.message;
    console.error(`[MIPRES] ✗ ${status} ${url}`, detail);
    return Promise.reject(err);
  }
);

// ════════════════════════════════════════════════════════════
// PASO 1 — Generar Token
// GET /api/GenerarToken/{nit}/{token}
// ════════════════════════════════════════════════════════════
export async function generarToken(nit, tokenBase) {
  const { data } = await mipres.get(`/GenerarToken/${nit}/${tokenBase}`);
  return data; // Retorna el token generado
}

// ════════════════════════════════════════════════════════════
// NUEVO PASO 2 — Consultar Entrega Previa (Validar)
// GET /api/ReporteEntregaXPrescripcion/{nit}/{token}/{noPres}
// ════════════════════════════════════════════════════════════
export async function getReporteEntregaXPrescripcion(nit, token, noPres) {
  const { data } = await mipres.get(`/ReporteEntregaXPrescripcion/${nit}/${token}/${noPres}`);
  return data; // Si devuelve un arreglo con elementos, significa que ya se entregó.
}

// NUEVAS CONSULTAS PROFUNDAS PARA HISTORIAL
export async function getProgramacionXPrescripcion(nit, token, noPres) {
  const { data } = await mipres.get(`/ProgramacionXPrescripcion/${nit}/${token}/${noPres}`);
  return data;
}

export async function getEntregaXPrescripcion(nit, token, noPres) {
  const { data } = await mipres.get(`/EntregaXPrescripcion/${nit}/${token}/${noPres}`);
  return data;
}

// ════════════════════════════════════════════════════════════
// NUEVO PASO 3 — Consultar Direccionamiento
// GET /api/DireccionamientoXPrescripcion/{nit}/{token}/{noPres}
// Retorna: [{ Id, IdDireccionamiento, CodSerTecAEntregar... }]
// ════════════════════════════════════════════════════════════
export async function getDireccionamientoXPrescripcion(nit, token, noPres) {
  const { data } = await mipres.get(`/DireccionamientoXPrescripcion/${nit}/${token}/${noPres}`);
  return data;
}

// ════════════════════════════════════════════════════════════
// PASO 3 — Programación
// PUT /api/Programacion/{nit}/{token}
// Requiere: ID (de Paso 2), FecMaxEnt, etc.
// ════════════════════════════════════════════════════════════
export async function programacion(nit, token, payload) {
  const { data } = await mipres.put(`/Programacion/${nit}/${token}`, payload);
  return data;
}

// ════════════════════════════════════════════════════════════
// PASO 4 — Entrega
// PUT /api/Entrega/{nit}/{token}
// Requiere: ID (de Paso 2), CodSerTecEntregado, etc.
// ════════════════════════════════════════════════════════════
export async function entrega(nit, token, payload) {
  const { data } = await mipres.put(`/Entrega/${nit}/${token}`, payload);
  return data;
}

// ════════════════════════════════════════════════════════════
// PASO 5 — Reporte de Entrega
// PUT /api/ReporteEntrega/{nit}/{token}
// Requiere: ID (de Paso 2), EstadoEntrega, ValorEntregado
// ════════════════════════════════════════════════════════════
export async function reporteEntrega(nit, token, payload) {
  const { data } = await mipres.put(`/ReporteEntrega/${nit}/${token}`, payload);
  return data;
}
