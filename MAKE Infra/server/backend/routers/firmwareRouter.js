// firmwareRouter.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const firmwareController = require('../controllers/firmwareController.js');

// Get all firmware files for a sensor
router.get('/sensor/:sensorId', firmwareController.listFirmwareForSensor);

// Upload new firmware for a sensor
router.post('/sensor/:sensorId', upload.single('firmware'), firmwareController.uploadFirmwareForSensor);

// Download firmware binary by firmwareId
router.get('/:firmwareId', firmwareController.downloadFirmware);

// Soft/hard delete firmware
router.delete('/:firmwareId', firmwareController.deleteFirmware);

// Restore/undelete firmware (for prod)
router.patch('/:firmwareId', firmwareController.restoreFirmware);

// Trigger OTA (POST body: {sensorId, firmwareId})
router.post('/ota', firmwareController.triggerOTA);

module.exports = router;

