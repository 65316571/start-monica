import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Get all tags
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a tag
router.post('/', async (req, res) => {
  try {
    const { id, name, color } = req.body;
    let query, params;

    if (id) {
        query = `INSERT INTO tags (id, name, color) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (id) DO UPDATE 
                 SET name = EXCLUDED.name, color = EXCLUDED.color
                 RETURNING *`;
        params = [id, name, color];
    } else {
        query = `INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING *`;
        params = [name, color];
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
    const { name, color } = req.body;
    const result = await pool.query(
      `UPDATE tags SET name = $1, color = $2 WHERE id = $3 RETURNING *`,
      [name, color, id]
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
