import pool from '../db/connection.js';

// ── Obtener todos los procesos ───────────────────────────────
export async function getAll() {
  const [rows] = await pool.query(
    'SELECT * FROM procesos_mipres ORDER BY created_at DESC'
  );
  return rows;
}

// ── Obtener un proceso por id_local ──────────────────────────
export async function getById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM procesos_mipres WHERE id_local = ?',
    [id]
  );
  return rows[0] || null;
}

// ── Crear nuevo proceso (estado INICIADO) ────────────────────
export async function create({ nit, token }) {
  const [result] = await pool.query(
    `INSERT INTO procesos_mipres (nit, token, estado)
     VALUES (?, ?, 'INICIADO')`,
    [nit, token]
  );
  return result.insertId;
}

// ── Actualizar campos del proceso ────────────────────────────
export async function update(id, fields) {
  // Construye dinámicamente solo los campos que llegan
  const allowed = [
    'id_mipres', 'id_programacion', 'id_entrega', 'id_reporte',
    'estado', 'token', 'nit', 'no_prescripcion',
    'cod_ser_tec_a_entregar', 'cant_tot_a_entregar',
    'fec_max_ent', 'disponibles'
  ];

  const updates = [];
  const values  = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (updates.length === 0) return false;

  values.push(id);
  await pool.query(
    `UPDATE procesos_mipres SET ${updates.join(', ')} WHERE id_local = ?`,
    values
  );
  return true;
}
