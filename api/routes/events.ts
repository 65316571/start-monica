import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Get all events with participants and their tags
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        COALESCE(
          json_agg(
            json_build_object(
              'people', json_build_object(
                'id', p.id, 
                'name', p.name,
                'person_tags', (
                    SELECT COALESCE(json_agg(json_build_object('tags', json_build_object('id', t.id, 'name', t.name, 'color', t.color))), '[]')
                    FROM person_tags pt
                    JOIN tags t ON pt.tag_id = t.id
                    WHERE pt.person_id = p.id
                )
              )
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'
        ) AS event_participants
      FROM events e
      LEFT JOIN event_participants ep ON e.id = ep.event_id
      LEFT JOIN people p ON ep.person_id = p.id
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single event
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        e.*,
        COALESCE(
          json_agg(
            json_build_object(
              'people', json_build_object(
                'id', p.id, 
                'name', p.name,
                 'person_tags', (
                    SELECT COALESCE(json_agg(json_build_object('tags', json_build_object('id', t.id, 'name', t.name, 'color', t.color))), '[]')
                    FROM person_tags pt
                    JOIN tags t ON pt.tag_id = t.id
                    WHERE pt.person_id = p.id
                )
              )
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'
        ) AS event_participants
      FROM events e
      LEFT JOIN event_participants ep ON e.id = ep.event_id
      LEFT JOIN people p ON ep.person_id = p.id
      WHERE e.id = $1
      GROUP BY e.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create an event
router.post('/', async (req, res) => {
  try {
    const { id, name, event_date, type, description, location } = req.body;
    let query, params;

    if (id) {
        query = `INSERT INTO events (id, name, event_date, type, description, location) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 ON CONFLICT (id) DO UPDATE 
                 SET name = EXCLUDED.name, event_date = EXCLUDED.event_date, type = EXCLUDED.type, 
                     description = EXCLUDED.description, location = EXCLUDED.location, updated_at = NOW()
                 RETURNING *`;
        params = [id, name, event_date, type, description, location];
    } else {
        query = `INSERT INTO events (name, event_date, type, description, location) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING *`;
        params = [name, event_date, type, description, location];
    }

    const result = await pool.query(query, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, event_date, type, description, location } = req.body;
    const result = await pool.query(
      `UPDATE events 
       SET name = $1, event_date = $2, type = $3, description = $4, location = $5, updated_at = NOW() 
       WHERE id = $6 
       RETURNING *`,
      [name, event_date, type, description, location, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
