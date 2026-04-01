import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pool de conexiones MySQL
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'mipres_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ── Verifica la conexión ─────────────────────────────────────
export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    conn.release();
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    process.exit(1);
  }
}

// ── Ejecuta el schema SQL (creación de tablas) ───────────────
export async function runMigrations() {
  try {
    const schemaPath = join(__dirname, 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf8');

    // Usamos una conexión directa con multipleStatements habilitado
    const conn = await mysql.createConnection({
      host:               process.env.DB_HOST     || 'localhost',
      port:               Number(process.env.DB_PORT) || 3306,
      user:               process.env.DB_USER     || 'root',
      password:           process.env.DB_PASSWORD || '',
      database:           process.env.DB_NAME     || 'mipres_db',
      multipleStatements: true,
    });

    await conn.query(sql);
    await conn.end();

    console.log('✅ Migraciones ejecutadas — tabla procesos_mipres lista');
  } catch (error) {
    console.error('❌ Error en migraciones:', error.message);
    process.exit(1);
  }
}

export default pool;
