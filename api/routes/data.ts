import { Router } from 'express';
import pool from '../db.js';

const router = Router();

const tableExists = async (client, table) => {
  const result = await client.query('SELECT to_regclass($1) as exists', [`public.${table}`]);
  return !!result.rows[0]?.exists;
};

const safeQueryTable = async (client, table, orderBy = '1') => {
  const exists = await tableExists(client, table);
  if (!exists) {
    return [];
  }

  const result = await client.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
  return result.rows;
};

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
  
  const updateCols = columns.filter(col => !conflictCols.includes(col) && !(hasUpdatedAt && col === 'updated_at'));
  
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
    
    if (await tableExists(client, 'images_tags_map')) await client.query('DELETE FROM images_tags_map');
    if (await tableExists(client, 'event_participants')) await client.query('DELETE FROM event_participants');
    if (await tableExists(client, 'person_tags')) await client.query('DELETE FROM person_tags');
    if (await tableExists(client, 'relationships')) await client.query('DELETE FROM relationships');
    if (await tableExists(client, 'images')) await client.query('DELETE FROM images');
    if (await tableExists(client, 'events')) await client.query('DELETE FROM events');
    if (await tableExists(client, 'people')) await client.query('DELETE FROM people');
    if (await tableExists(client, 'tags')) await client.query('DELETE FROM tags');
    
    await client.query('COMMIT');
    res.json({ message: 'All data cleared successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Export data
router.get('/export', async (req, res) => {
  const client = await pool.connect();
  try {
    const [
      peopleRows,
      tagsRows,
      eventsRows,
      relationshipsRows,
      eventParticipantsRows,
      personTagsRows,
      imagesRows,
      imagesTagsMapRows,
    ] = await Promise.all([
      safeQueryTable(client, 'people', 'created_at ASC NULLS LAST, id ASC'),
      safeQueryTable(client, 'tags', 'created_at ASC NULLS LAST, id ASC'),
      safeQueryTable(client, 'events', 'event_date ASC NULLS LAST, created_at ASC NULLS LAST, id ASC'),
      safeQueryTable(client, 'relationships', 'created_at ASC NULLS LAST, id ASC'),
      safeQueryTable(client, 'event_participants', 'created_at ASC NULLS LAST, id ASC'),
      safeQueryTable(client, 'person_tags', 'created_at ASC NULLS LAST, person_id ASC, tag_id ASC'),
      safeQueryTable(client, 'images', 'created_at ASC NULLS LAST, id ASC'),
      safeQueryTable(client, 'images_tags_map', 'created_at ASC NULLS LAST, image_id ASC, tag_id ASC'),
    ]);

    res.json({
      people: peopleRows,
      tags: tagsRows,
      events: eventsRows,
      relationships: relationshipsRows,
      event_participants: eventParticipantsRows,
      person_tags: personTagsRows,
      images: imagesRows,
      images_tags_map: imagesTagsMapRows,
    });
  } catch (err) {
    console.error('Export data failed:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Import data
router.post('/import', async (req, res) => {
  const { people, events, tags, relationships, event_participants, person_tags, images, images_tags_map } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    if (people && await tableExists(client, 'people')) await upsert(client, 'people', people, ['id'], true);
    if (tags && await tableExists(client, 'tags')) await upsert(client, 'tags', tags, ['id'], false);
    if (events && await tableExists(client, 'events')) await upsert(client, 'events', events, ['id'], true);
    if (images && await tableExists(client, 'images')) await upsert(client, 'images', images, ['id'], false);
    if (relationships && await tableExists(client, 'relationships')) await upsert(client, 'relationships', relationships, ['id'], true);
    if (event_participants && await tableExists(client, 'event_participants')) await upsert(client, 'event_participants', event_participants, ['id'], false);
    // person_tags PK is (person_id, tag_id)
    if (person_tags && await tableExists(client, 'person_tags')) await upsert(client, 'person_tags', person_tags, ['person_id', 'tag_id'], false);
    if (images_tags_map && await tableExists(client, 'images_tags_map')) await upsert(client, 'images_tags_map', images_tags_map, ['image_id', 'tag_id'], false);

    if (images && await tableExists(client, 'images')) {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('images', 'id'),
          COALESCE((SELECT MAX(id) FROM images), 1),
          (SELECT COUNT(*) > 0 FROM images)
        )
      `);
    }

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
