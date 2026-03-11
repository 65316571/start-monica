import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Get relationships
router.get('/', async (req, res) => {
  try {
    const { person_a_id, person_b_id, person_id } = req.query;
    
    // If querying for a specific person (either A or B), join with people to get details
    if (person_id) {
        const result = await pool.query(`
            SELECT r.*, 
                   json_build_object('id', pa.id, 'name', pa.name) as person_a,
                   json_build_object('id', pb.id, 'name', pb.name) as person_b
            FROM relationships r
            LEFT JOIN people pa ON r.person_a_id = pa.id
            LEFT JOIN people pb ON r.person_b_id = pb.id
            WHERE r.person_a_id = $1 OR r.person_b_id = $1
        `, [person_id]);
        return res.json(result.rows);
    }

    // Standard filter
    let query = 'SELECT * FROM relationships WHERE 1=1';
    const params = [];

    if (person_a_id) {
      params.push(person_a_id);
      query += ` AND person_a_id = $${params.length}`;
    }
    if (person_b_id) {
      params.push(person_b_id);
      query += ` AND person_b_id = $${params.length}`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create relationship
router.post('/', async (req, res) => {
  try {
    const { id, person_a_id, person_b_id, type, strength, source } = req.body;
    let query, params;

    if (id) {
        query = `INSERT INTO relationships (id, person_a_id, person_b_id, type, strength, source) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 ON CONFLICT (id) DO UPDATE 
                 SET person_a_id = EXCLUDED.person_a_id, person_b_id = EXCLUDED.person_b_id, 
                     type = EXCLUDED.type, strength = EXCLUDED.strength, source = EXCLUDED.source, updated_at = NOW()
                 RETURNING *`;
        params = [id, person_a_id, person_b_id, type, strength, source];
    } else {
        query = `INSERT INTO relationships (person_a_id, person_b_id, type, strength, source) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING *`;
        params = [person_a_id, person_b_id, type, strength, source];
    }

    const result = await pool.query(query, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update relationship
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { strength, type, source } = req.body;
    
    // Build update query dynamically
    let query = 'UPDATE relationships SET updated_at = NOW()';
    const params = [id];
    let paramIdx = 2;

    if (strength !== undefined) {
      query += `, strength = $${paramIdx++}`;
      params.push(strength);
    }
    if (type !== undefined) {
      query += `, type = $${paramIdx++}`;
      params.push(type);
    }
    if (source !== undefined) {
      query += `, source = $${paramIdx++}`;
      params.push(source);
    }

    query += ` WHERE id = $1 RETURNING *`;

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
