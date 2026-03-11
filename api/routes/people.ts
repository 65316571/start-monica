import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Get all people
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM people ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single person
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM people WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a person
router.post('/', async (req, res) => {
  try {
    const { id, name, gender, contact_info, notes, identity, meet_date, province, city, industry } = req.body;
    
    let query, params;
    if (id) {
        query = `INSERT INTO people (id, name, gender, contact_info, notes, identity, meet_date, province, city, industry) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
                 ON CONFLICT (id) DO UPDATE 
                 SET name = EXCLUDED.name, gender = EXCLUDED.gender, contact_info = EXCLUDED.contact_info, 
                     notes = EXCLUDED.notes, identity = EXCLUDED.identity, meet_date = EXCLUDED.meet_date, 
                     province = EXCLUDED.province, city = EXCLUDED.city, industry = EXCLUDED.industry, updated_at = NOW()
                 RETURNING *`;
        params = [id, name, gender, contact_info, notes, identity, meet_date, province, city, industry];
    } else {
        query = `INSERT INTO people (name, gender, contact_info, notes, identity, meet_date, province, city, industry) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                 RETURNING *`;
        params = [name, gender, contact_info, notes, identity, meet_date, province, city, industry];
    }

    const result = await pool.query(query, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a person
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, contact_info, notes, identity, meet_date, province, city, industry } = req.body;
    const result = await pool.query(
      `UPDATE people 
       SET name = $1, gender = $2, contact_info = $3, notes = $4, identity = $5, meet_date = $6, province = $7, city = $8, industry = $9, updated_at = NOW() 
       WHERE id = $10 
       RETURNING *`,
      [name, gender, contact_info, notes, identity, meet_date, province, city, industry, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a person
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM people WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json({ message: 'Person deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
