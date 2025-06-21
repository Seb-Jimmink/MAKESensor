// hierarchyController.js

const db = require('../db');

// Return a nested structure: machines → components → sensors
exports.getHierarchy = async (req, res) => {
  try {
    const { rows: machines } = await db.query('SELECT * FROM machines ORDER BY id');
    for (const machine of machines) {
      const { rows: components } = await db.query('SELECT * FROM components WHERE machine_id = $1 ORDER BY id', [machine.id]);
      for (const component of components) {
        const { rows: sensors } = await db.query('SELECT * FROM sensors WHERE component_id = $1 ORDER BY id', [component.id]);
        component.sensors = sensors;
      }
      machine.components = components;
    }
    res.json(machines);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};
