import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Get participants for an event OR events for a person
router.get('/', async (req, res) => {
  try {
    const { event_id, person_id } = req.query;
    
    if (event_id) {
      const result = await pool.query(`
        SELECT ep.event_id, ep.person_id, ep.role,
               json_build_object('id', p.id, 'name', p.name) as people
        FROM event_participants ep
        JOIN people p ON ep.person_id = p.id
        WHERE ep.event_id = $1
      `, [event_id]);
      res.json(result.rows);
    } else if (person_id) {
      const result = await pool.query(`
        SELECT ep.event_id, ep.person_id, ep.role,
               json_build_object('id', e.id, 'name', e.name, 'event_date', e.event_date, 'type', e.type) as events
        FROM event_participants ep
        JOIN events e ON ep.event_id = e.id
        WHERE ep.person_id = $1
        ORDER BY e.event_date DESC
      `, [person_id]);
      res.json(result.rows);
    } else {
      res.status(400).json({ error: 'event_id or person_id is required' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create event participants
router.post('/', async (req, res) => {
  try {
    const data = req.body; // Expect array of { event_id, person_id }
    const items = Array.isArray(data) ? data : [data];
    
    if (items.length === 0) return res.json([]);

    // Generate values string ($1, $2), ($3, $4), ...
    const values = items.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
    const params = items.flatMap(item => [item.event_id, item.person_id]);

    const result = await pool.query(
      `INSERT INTO event_participants (event_id, person_id) VALUES ${values} RETURNING *`,
      params
    );
    res.status(201).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete event participants
router.delete('/', async (req, res) => {
  try {
    const { event_id } = req.query;
    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }
    
    const result = await pool.query('DELETE FROM event_participants WHERE event_id = $1 RETURNING *', [event_id]);
    res.json({ message: 'Event participants deleted successfully', count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
