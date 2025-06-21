// machinesController.js

const db = require('../db');

// GET all machines
exports.getAllMachines = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM machines ORDER BY created_at');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// GET machine by ID
exports.getMachineById = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM machines WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Machine not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// CREATE machine
exports.createMachine = async (req, res) => {
  try {
    const { name, supplier, location, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });

    // Let Postgres generate the UUID
    const sql = `
      INSERT INTO machines (name, supplier, location, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *`;
    const values = [name, supplier, location, description];

    const { rows } = await db.query(sql, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error adding machine' });
  }
};

// PATCH: Partial update for a machine
exports.patchMachine = async (req, res) => {
  const allowed = [
    "name", "supplier", "location", "description"
  ];

  const set = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      set.push(`${key} = $${idx++}`);
      values.push(req.body[key]);
    }
  }

  if (!set.length) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  values.push(req.params.id);

  try {
    const sql = `
      UPDATE machines
      SET ${set.join(', ')}
      WHERE id = $${values.length}
      RETURNING *`;
    const { rows } = await db.query(sql, values);
    if (!rows.length) return res.status(404).json({ error: 'Machine not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error (patch)', details: err.message });
  }
};

// DELETE machine
exports.deleteMachine = async (req, res) => {
  try {
    await db.query('DELETE FROM machines WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error deleting machine' });
  }
};

// GET all components for a machine
exports.getComponentsForMachine = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM components WHERE machine_id=$1', [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching components' });
  }
};