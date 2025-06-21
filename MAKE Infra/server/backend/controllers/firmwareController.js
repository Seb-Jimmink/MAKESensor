// firmwareController.js

const db = require('../db');
const { triggerOTAUpdate } = require('../services/mqttServices.js');

const ip = process.env.API_IP
const port = process.env.API_PORT

// 1. List all firmware for a sensor
// List firmware for a sensor, with optional ?show=all|active|deleted
exports.listFirmwareForSensor = async (req, res) => {
  const { sensorId } = req.params;
  const { show } = req.query; // 'all' | 'active' | 'deleted'

  let query = 'SELECT * FROM sensor_firmware_files WHERE sensor_id = $1';
  let params = [sensorId];

  if (show === 'active') {
    query += ' AND deleted_at IS NULL';
  } else if (show === 'deleted') {
    query += ' AND deleted_at IS NOT NULL';
  }
  query += ' ORDER BY uploaded_at DESC';

  const { rows } = await db.query(query, params);
  res.json(rows);
};


// 2. Upload new firmware
exports.uploadFirmwareForSensor = async (req, res) => {
  const { sensorId } = req.params;
  const { version, environment } = req.body;
  const file = req.file;
  if (!file || !version) return res.status(400).json({ ok: false, message: 'File and version required.' });
  const data = file.buffer;
  const { rows } = await db.query(
    `INSERT INTO sensor_firmware_files
      (sensor_id, version, uploaded_at, file_size_bytes, data, environment)
     VALUES ($1, $2, NOW(), $3, $4, $5)
     RETURNING id`,
    [sensorId, version, file.size, data, environment || 'development']
  );
  res.json({ ok: true, firmwareId: rows[0].id });
};

// 3. Download firmware binary
exports.downloadFirmware = async (req, res) => {
  const { firmwareId } = req.params;
  const { rows } = await db.query('SELECT data, version FROM sensor_firmware_files WHERE id = $1', [firmwareId]);
  if (!rows.length) return res.status(404).json({ ok: false, message: 'Not found' });
  res.set('Content-Type', 'application/octet-stream');
  res.set('Content-Disposition', `attachment; filename="firmware_${rows[0].version}.bin"`);
  res.send(rows[0].data);
};

// 4. Trigger OTA
exports.triggerOTA = async (req, res) => {
  const { sensorId, firmwareId } = req.body;
  if (!sensorId || !firmwareId) return res.status(400).json({ ok: false, message: 'sensorId and firmwareId required' });
  const firmwareUrl = `http://${ip}:${port}/api/firmware/${firmwareId}`;
  await triggerOTAUpdate({ sensorId, firmwareUrl });
  res.json({ ok: true, message: 'OTA update triggered.' });
};

// 5. Delete/soft-delete firmware
exports.deleteFirmware = async (req, res) => {
  const { firmwareId } = req.params;
  // Lookup environment
  const { rows } = await db.query('SELECT environment FROM sensor_firmware_files WHERE id = $1', [firmwareId]);
  if (!rows.length) return res.status(404).json({ ok: false, message: 'Not found' });

  if (rows[0].environment === 'production') {
    await db.query('UPDATE sensor_firmware_files SET deleted_at = NOW() WHERE id = $1', [firmwareId]);
  } else {
    await db.query('DELETE FROM sensor_firmware_files WHERE id = $1', [firmwareId]);
  }
  res.json({ ok: true });
};

// 6. Restore production firmware
exports.restoreFirmware = async (req, res) => {
  const { firmwareId } = req.params;
  let { undelete } = req.body;

  // Convert string to boolean if needed
  if (typeof undelete === 'string') {
    if (undelete.toLowerCase() === "true") undelete = true;
    else if (undelete.toLowerCase() === "false") undelete = false;
  }

  console.log('PATCH firmware', firmwareId, 'undelete:', undelete, typeof undelete);

  if (undelete === true) {
    await db.query('UPDATE sensor_firmware_files SET deleted_at = NULL WHERE id = $1', [firmwareId]);
    return res.json({ ok: true });
  } else if (undelete === false) {
    await db.query('UPDATE sensor_firmware_files SET deleted_at = NOW() WHERE id = $1', [firmwareId]);
    return res.json({ ok: true });
  } else {
    return res.status(400).json({ ok: false, message: 'Invalid' });
  }
};
