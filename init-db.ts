import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './api/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
  try {
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL...');
    await pool.query(sql);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization failed:', err);
  } finally {
    await pool.end();
  }
}

initDb();
