// mqttServices.js

const mqtt = require('mqtt');
const fs = require('fs');
const db = require('../db');

const options = {
  protocol: 'wss',
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  ca: fs.readFileSync(process.env.CA_CERT_PATH),
  keepalive: 60,
  rejectUnauthorized: false
};

console.log('Connecting to MQTT broker...');
const client = mqtt.connect(process.env.MQTT_BROKER, options);

const activeSubscriptions = new Map();

function subscribeSensorTopic(sensor) {
  const topic = sensor.mqtt_topic;
  if (!topic || activeSubscriptions.has(topic)) return;

  const handler = async (recvTopic, message) => {
    if (recvTopic !== topic) return;
    console.log(`[MQTT] Received on ${recvTopic}: ${message.toString()}`);

    try {
      const data = JSON.parse(message.toString());
      // Lookup sensor by topic (should be unique)
      const { rows: [sensorRow] } = await db.query('SELECT * FROM sensors WHERE mqtt_topic = $1', [topic]);
      if (!sensorRow) {
        console.warn(`[MQTT] No sensor found for topic ${topic}`);
        return;
      }
      // For each field in data, find the field_id and store measurement
      for (const [fieldName, value] of Object.entries(data)) {
        const { rows: [fieldRow] } = await db.query(
          'SELECT id FROM sensor_fields WHERE sensor_id = $1 AND field_name = $2',
          [sensorRow.id, fieldName]
        );
        if (!fieldRow) {
          console.warn(`[MQTT] No field ${fieldName} for sensor ${sensorRow.id} (${sensorRow.name})`);
          continue;
        }
        await db.query(
          `INSERT INTO sensor_measurements (sensor_id, field_id, value)
           VALUES ($1, $2, $3)`,
          [sensorRow.id, fieldRow.id, value]
        );
      }
      // Update last_seen
      await db.query('UPDATE sensors SET last_seen = NOW(), status = \'ACTIVE\', updated_at = NOW() WHERE id = $1', [sensorRow.id]);
    } catch (err) {
      console.error('[MQTT] Error processing sensor data:', err);
    }
  };

  client.on('message', handler);

  client.subscribe(topic, (err) => {
    if (!err) {
      activeSubscriptions.set(topic, handler);
      console.log(`[MQTT] Subscribed to ${topic}`);
    } else {
      console.error(`[MQTT] Subscribe error on ${topic}:`, err);
    }
  });
}

function unsubscribeSensorTopic(topic) {
  if (!topic || !activeSubscriptions.has(topic)) return;
  const handler = activeSubscriptions.get(topic);
  client.unsubscribe(topic, () => {
    client.removeListener('message', handler);
    activeSubscriptions.delete(topic);
    console.log(`[MQTT] Unsubscribed from ${topic}`);
  });
}

// Subscribe to all known sensor topics and device discovery
client.on('connect', async () => {
  console.log('[MQTT] Connected');
  try {
    const { rows } = await db.query('SELECT * FROM sensors WHERE mqtt_topic IS NOT NULL');
    rows.forEach(subscribeSensorTopic);
    console.log(`[MQTT] Subscribed to ${rows.length} sensor topics.`);
  } catch (err) {
    console.error('[MQTT] Error loading sensors from DB:', err);
  }
  // Device discovery: listen to all device info topics
  client.subscribe('devices/+/info', (err) => {
    if (!err) {
      console.log('[MQTT] Subscribed to device info for auto-discovery');
    } else {
      console.error('[MQTT] Subscribe error for device info:', err);
    }
  });
});

// Handle device info (auto-discovery)
client.on('message', async (topic, message) => {
  const match = topic.match(/^devices\/([^/]+)\/info$/);
  if (!match) return; // not a device info message

  const mac = match[1];
  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch (e) {
    return console.error('[MQTT] Bad JSON in device info:', e);
  }

  // Check if sensor exists by MAC
  const { rows } = await db.query('SELECT * FROM sensors WHERE mac_address = $1', [mac]);
  if (rows.length) {
    // Exists, update info (but not name/microcontroller/manufacturer/etc)
    await db.query(
      `UPDATE sensors SET
        firmware_version = $1,
        ip_address = $2,
        last_seen = NOW(),
        status = 'ACTIVE',
        updated_at = NOW()
      WHERE mac_address = $3`,
      [payload.firmware, payload.ip, mac]
    );
    console.log(`[MQTT] Updated device info for MAC ${mac}`);
  } else {
    // Not in DB, add as PENDING/NEW (name and fields to be set by frontend)
    await db.query(
      `INSERT INTO sensors (name, status, firmware_version, mac_address, ip_address, last_seen, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())`,
      [`Pending Sensor (${mac})`, 'PENDING', payload.firmware, mac, payload.ip]
    );
    console.log(`[MQTT] Added new sensor as PENDING for MAC ${mac}`);
  }
});

async function triggerOTAUpdate({ sensorId, firmwareUrl }) {
  // 1. Lookup MAC address
  const { rows } = await db.query('SELECT mac_address FROM sensors WHERE id = $1', [sensorId]);
  if (!rows.length) throw new Error('Sensor not found');

  const mac = rows[0].mac_address;
  const otaTopic = `devices/${mac}/ota`;

  // 3. Publish the firmware URL to the OTA topic
  client.publish(otaTopic, firmwareUrl, { qos: 1 }, (err) => {
    if (err) {
      console.error(`[OTA] MQTT publish error to ${otaTopic}:`, err);
    } else {
      console.log(`[OTA] OTA update triggered for ${mac} (sensorId: ${sensorId}) with firmware URL: ${firmwareUrl}`);
    }
  });
}

// Exports for CRUD use
module.exports = {
  client,
  subscribeToNewSensor: subscribeSensorTopic,
  unsubscribeFromSensor: (sensor) => unsubscribeSensorTopic(sensor.mqtt_topic),
  updateSensorSubscription: (oldSensor, newSensor) => {
    if (oldSensor.mqtt_topic !== newSensor.mqtt_topic) {
      unsubscribeSensorTopic(oldSensor.mqtt_topic);
      subscribeSensorTopic(newSensor);
    }
  },
  triggerOTAUpdate
};
