import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Get tags for a person
router.get('/', async (req, res) => {
  try {
    const { person_id, tag_id } = req.query;
    let query = `
      SELECT pt.person_id, pt.tag_id, 
             json_build_object('id', t.id, 'name', t.name, 'color', t.color) as tags
      FROM person_tags pt
      JOIN tags t ON pt.tag_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (person_id) {
      params.push(person_id);
      query += ` AND pt.person_id = $${params.length}`;
    }
    
    // Support filtering by list of person_ids if needed (for EventForm optimization)
    // But currently frontend fetches all tags or filters by person_id.
    // The EventForm does: supabase.from('person_tags').select('person_id, tag_id').in('person_id', personIds)
    // Express query params for array: ?person_id[]=1&person_id[]=2
    
    if (req.query.person_ids) { // Custom param for multiple IDs
        const ids = Array.isArray(req.query.person_ids) ? req.query.person_ids : [req.query.person_ids];
        query += ` AND pt.person_id = ANY($${params.length + 1}::uuid[])`;
        params.push(ids);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create person tag
router.post('/', async (req, res) => {
  try {
    const data = req.body; // Expect array or object
    const items = Array.isArray(data) ? data : [data];
    
    if (items.length === 0) return res.json([]);

    // Generate values string ($1, $2), ($3, $4), ...
    const values = items.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
    const params = items.flatMap(item => [item.person_id, item.tag_id]);

    const result = await pool.query(
      `INSERT INTO person_tags (person_id, tag_id) VALUES ${values} RETURNING *`,
      params
    );
    res.status(201).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete person tags
router.delete('/', async (req, res) => {
  try {
    const { person_id } = req.query;
    if (!person_id) {
      return res.status(400).json({ error: 'person_id is required' });
    }
    
    const result = await pool.query('DELETE FROM person_tags WHERE person_id = $1 RETURNING *', [person_id]);
    res.json({ message: 'Person tags deleted successfully', count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
