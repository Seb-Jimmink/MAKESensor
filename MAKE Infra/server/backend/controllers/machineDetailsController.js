// machineDetailsController.js

const db = require('../db');

// GET all machine_details for a machine
exports.getDetailsForMachine = async (req, res) => {
  try {
    // Param could be either :machineId or :id (be consistent with your router!)
    const machineId = req.params.machineId || req.params.id;
    const { rows } = await db.query('SELECT * FROM machine_details WHERE machine_id = $1 ORDER BY created_at', [machineId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// GET detail by ID
exports.getDetailById = async (req, res) => {
  try {
    // Param is /details/:detailId
    const detailId = req.params.detailId || req.params.id;
    const { rows } = await db.query('SELECT * FROM machine_details WHERE id = $1', [detailId]);
    if (!rows.length) return res.status(404).json({ error: 'Machine detail not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// CREATE detail
exports.createDetail = async (req, res) => {
  try {
    // Accept machine_id from body, but prefer the URL param if provided (RESTful)
    const machine_id = req.body.machine_id || req.params.id;
    if (!machine_id) return res.status(400).json({ error: 'machine_id is required.' });

    const {
      serial_number, current_job, install_date,
      last_checkup_date, next_checkup_date, notes
    } = req.body;

    const sql = `
      INSERT INTO machine_details
        (machine_id, serial_number, current_job, install_date, last_checkup_date, next_checkup_date, notes)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`;
    const values = [machine_id, serial_number, current_job, install_date, last_checkup_date, next_checkup_date, notes];

    const { rows } = await db.query(sql, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error adding machine detail' });
  }
};

// PATCH: Partial update for a machine detail
exports.patchDetail = async (req, res) => {
  const allowed = [
    "serial_number", "current_job", "install_date",
    "last_checkup_date", "next_checkup_date", "notes"
  ];

  const set = [];
  const values = [];
  let idx = 1;
  const detailId = req.params.detailId || req.params.id;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      set.push(`${key} = $${idx++}`);
      values.push(req.body[key]);
    }
  }

  if (!set.length) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  values.push(detailId);

  try {
    const sql = `
      UPDATE machine_details
      SET ${set.join(', ')}
      WHERE id = $${values.length}
      RETURNING *`;
    const { rows } = await db.query(sql, values);
    if (!rows.length) return res.status(404).json({ error: 'Machine detail not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error (patch)', details: err.message });
  }
};

// DELETE detail
exports.deleteDetail = async (req, res) => {
  try {
    const detailId = req.params.detailId || req.params.id;
    await db.query('DELETE FROM machine_details WHERE id=$1', [detailId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error deleting machine detail' });
  }
};