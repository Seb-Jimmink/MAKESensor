// sensorController.js

const mqttServices = require('../services/mqttServices');
const db = require('../db');

// Get all sensors
exports.getAllSensors = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM sensors ORDER BY created_at');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// Get a single sensor
exports.getSensorById = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM sensors WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Sensor not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// Create a sensor
exports.createSensor = async (req, res) => {
  try {
    const {
      component_id, name, sensor_type, microcontroller_type, manufacturer,
      mqtt_topic, status, last_seen, calibration_date,
      firmware_version, mac_address, ip_address,
      install_date, measurement_frequency
    } = req.body;

    // For manual creation, require at least a name. Component can be nullable (set later).
    if (!name) return res.status(400).json({ error: 'Sensor name is required.' });

    // Validate UUID for component_id if present
    if (component_id && !/^[0-9a-fA-F-]{36}$/.test(component_id)) {
      return res.status(400).json({ error: 'component_id must be a valid UUID' });
    }

    const sql = `
      INSERT INTO sensors (
        component_id, name, sensor_type, microcontroller_type, manufacturer,
        mqtt_topic, status, last_seen, calibration_date, firmware_version,
        mac_address, ip_address, install_date, measurement_frequency
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14
      )
      RETURNING *`;
    const values = [
      component_id || null, name, sensor_type || null, microcontroller_type || null, manufacturer || null,
      mqtt_topic || null, status || 'PENDING', last_seen || null, calibration_date || null, firmware_version || null,
      mac_address || null, ip_address || null, install_date || null, measurement_frequency || null
    ];

    const { rows } = await db.query(sql, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error adding sensor', details: err.message });
  }
};

exports.patchSensor = async (req, res) => {
  // Only allow these fields to be patched by the frontend:
  const allowed = [
    "component_id", "name", "sensor_type", "microcontroller_type", "manufacturer",
    "mqtt_topic", "status", "calibration_date", "install_date", "measurement_frequency"
  ];

  // 1. Get old sensor (for mqtt_topic)
  const { rows: [oldSensor] } = await db.query('SELECT * FROM sensors WHERE id = $1', [req.params.id]);
  if (!oldSensor) return res.status(404).json({ error: 'Sensor not found' });

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

  // Always update updated_at
  set.push(`updated_at = NOW()`);

  values.push(req.params.id); // for WHERE clause

  try {
    const sql = `
      UPDATE sensors
      SET ${set.join(', ')}
      WHERE id = $${values.length}
      RETURNING *`;
    const { rows } = await db.query(sql, values);
    if (!rows.length) return res.status(404).json({ error: 'Sensor not found' });
    const newSensor = rows[0];

    // 2. Update MQTT topic subscription if needed
    if (oldSensor.mqtt_topic !== newSensor.mqtt_topic) {
      const mqttServices = require('../services/mqttServices');
      mqttServices.updateSensorSubscription(oldSensor, newSensor);
    }

    res.json(newSensor);
  } catch (err) {
    res.status(500).json({ error: 'Database error (patch)', details: err.message });
  }
};


// DELETE sensor: add MQTT unsubscribe
exports.deleteSensor = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM sensors WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Sensor not found' });
    const sensor = rows[0];
    await db.query('DELETE FROM sensors WHERE id=$1', [req.params.id]);
    if (sensor.mqtt_topic) {
      mqttServices.unsubscribeFromSensor(sensor);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error deleting sensor' });
  }
};

// Get all fields for a sensor
exports.getSensorFields = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM sensor_fields WHERE sensor_id=$1', [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching sensor fields' });
  }
};

// Add a field to a sensor
exports.addSensorField = async (req, res) => {
  try {
    const sensor_id = req.params.id;
    const { field_name, unit } = req.body;
    if (!field_name) return res.status(400).json({ error: 'field_name is required.' });

    const sql = `
      INSERT INTO sensor_fields (sensor_id, field_name, unit)
      VALUES ($1, $2, $3)
      RETURNING *`;
    const values = [sensor_id, field_name, unit || null];
    const { rows } = await db.query(sql, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error adding sensor field' });
  }
};

// Update a field for a sensor
exports.updateSensorField = async (req, res) => {
  try {
    const field_id = req.params.fieldId;
    const { field_name, unit } = req.body;
    const sql = `
      UPDATE sensor_fields
      SET field_name=$1, unit=$2, updated_at=NOW()
      WHERE id=$3
      RETURNING *`;
    const values = [field_name, unit, field_id];
    const { rows } = await db.query(sql, values);
    if (!rows.length) return res.status(404).json({ error: 'Field not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error updating sensor field' });
  }
};

// Delete a field from a sensor
exports.deleteSensorField = async (req, res) => {
  try {
    const field_id = req.params.fieldId;
    await db.query('DELETE FROM sensor_fields WHERE id=$1', [field_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error deleting sensor field' });
  }
};

// Get sensor measurements
exports.getSensorMeasurements = async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) limit = 100;
    if (limit > 1000) limit = 1000;

    const { rows } = await db.query(
      'SELECT * FROM sensor_measurements WHERE sensor_id=$1 ORDER BY timestamp DESC LIMIT $2',
      [req.params.id, limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching sensor measurements' });
  }
};

// Get latest measurement for a sensor
exports.getSensorLatest = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT * FROM sensor_measurements
      WHERE sensor_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No measurements for sensor' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};