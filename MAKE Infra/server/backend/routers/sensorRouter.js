// sensorRouter.js

const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const multer = require('multer');
const upload = multer(); // In-memory storage

router.get('/', sensorController.getAllSensors);
router.get('/:id', sensorController.getSensorById);
router.post('/', sensorController.createSensor);
router.patch('/:id', sensorController.patchSensor);
router.delete('/:id', sensorController.deleteSensor);

// Nested resources
router.get('/:id/fields', sensorController.getSensorFields);
router.post('/:id/fields', sensorController.addSensorField);
router.patch('/:id/fields/:fieldId', sensorController.updateSensorField);
router.delete('/:id/fields/:fieldId', sensorController.deleteSensorField);

router.get('/:id/measurements', sensorController.getSensorMeasurements);
router.get('/:id/latest', sensorController.getSensorLatest);

module.exports = router;

