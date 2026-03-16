import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Get all tags
router.get('/', async (req, res) => {
  try {
    const { tag_type } = req.query;
    let query = 'SELECT * FROM tags';
    const params = [];
    
    if (tag_type) {
      query += ' WHERE tag_type = $1';
      params.push(tag_type);
    }
    
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a tag
router.post('/', async (req, res) => {
  try {
    const { id, name, color, icon, tag_type } = req.body;
    let query, params;

    if (id) {
        query = `INSERT INTO tags (id, name, color, icon, tag_type) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (id) DO UPDATE 
                 SET name = EXCLUDED.name, color = EXCLUDED.color, icon = EXCLUDED.icon, tag_type = EXCLUDED.tag_type
                 RETURNING *`;
        params = [id, name, color, icon, tag_type !== undefined ? tag_type : 'person'];
    } else {
        query = `INSERT INTO tags (name, color, icon, tag_type) VALUES ($1, $2, $3, $4) RETURNING *`;
        params = [name, color, icon, tag_type !== undefined ? tag_type : 'person'];
    }

    const result = await pool.query(query, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a tag
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon, tag_type } = req.body;
    const result = await pool.query(
      `UPDATE tags SET name = $1, color = $2, icon = $3, tag_type = $4 WHERE id = $5 RETURNING *`,
      [name, color, icon, tag_type !== undefined ? tag_type : 'person', id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a tag
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tags WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json({ message: 'Tag deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
