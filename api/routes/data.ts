import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Helper for bulk upsert
const upsert = async (client, table, data, conflictCols, hasUpdatedAt = false) => {
  if (!data || data.length === 0) return;
  
  // Ensure we use the columns from the first row as the source of truth for all rows
  // And fill missing keys with null
  const columns = Object.keys(data[0]);
  
  // Generate placeholders ($1, $2, ...), ($N+1, ...), ...
  const values = data.map((_, i) => 
    '(' + columns.map((_, j) => `$${i * columns.length + j + 1}`).join(',') + ')'
  ).join(',');
  
  const params = data.flatMap(row => columns.map(col => row[col]));
  
  const updateCols = columns.filter(col => !conflictCols.includes(col));
  
  let updateSet = updateCols.map(col => `${col} = EXCLUDED.${col}`).join(',');
  
  if (hasUpdatedAt && updateCols.length > 0) {
      updateSet += ', updated_at = NOW()';
  }
  
  if (updateSet.length === 0) {
      // Nothing to update, just do nothing on conflict
      const sql = `
        INSERT INTO ${table} (${columns.join(',')}) 
        VALUES ${values} 
        ON CONFLICT (${conflictCols.join(',')}) DO NOTHING
      `;
      await client.query(sql, params);
  } else {
      const sql = `
        INSERT INTO ${table} (${columns.join(',')}) 
        VALUES ${values} 
        ON CONFLICT (${conflictCols.join(',')}) 
        DO UPDATE SET ${updateSet}
      `;
      await client.query(sql, params);
  }
};

// Clear all data
router.post('/clear', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query('DELETE FROM event_participants');
    await client.query('DELETE FROM person_tags');
    await client.query('DELETE FROM relationships');
    await client.query('DELETE FROM events');
    await client.query('DELETE FROM people');
    await client.query('DELETE FROM tags');
    
    await client.query('COMMIT');
    res.json({ message: 'All data cleared successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Import data
router.post('/import', async (req, res) => {
  const { people, events, tags, relationships, event_participants, person_tags } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    if (people) await upsert(client, 'people', people, ['id'], true);
    if (tags) await upsert(client, 'tags', tags, ['id'], false);
    if (events) await upsert(client, 'events', events, ['id'], true);
    if (relationships) await upsert(client, 'relationships', relationships, ['id'], true);
    if (event_participants) await upsert(client, 'event_participants', event_participants, ['id'], false);
    // person_tags PK is (person_id, tag_id)
    if (person_tags) await upsert(client, 'person_tags', person_tags, ['person_id', 'tag_id'], false);

    await client.query('COMMIT');
    res.json({ message: 'Data imported successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
