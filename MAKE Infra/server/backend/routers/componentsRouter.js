// componentsRouter.js

const express = require('express');
const router = express.Router();
const controller = require('../controllers/componentsController');

// List all components
router.get('/', controller.getAllComponents);
// Get a single component
router.get('/:id', controller.getComponentById);
// Create a component
router.post('/', controller.createComponent);
// Patch a component
router.patch('/:id', controller.patchComponent);
// Delete a component
router.delete('/:id', controller.deleteComponent);
// List sensors for a component
router.get('/:id/sensors', controller.getSensorsForComponent);

module.exports = router;
