// machineRouter.js

const express = require('express');
const router = express.Router();
const machinesController = require('../controllers/machinesController');
const machineDetailsController = require('../controllers/machineDetailsController');

// --- Machines ---
router.get('/', machinesController.getAllMachines);
router.get('/:id', machinesController.getMachineById);
router.post('/', machinesController.createMachine);
router.patch('/:id', machinesController.patchMachine);
router.delete('/:id', machinesController.deleteMachine);

// List components for a machine
router.get('/:id/components', machinesController.getComponentsForMachine);

// --- Machine Details, CRUD under machines ---
router.get('/:id/details', machineDetailsController.getDetailsForMachine); // Get all details for one machine
router.post('/:id/details', machineDetailsController.createDetail);        // Add new detail for this machine (pass machine_id in body or infer from param)

// --- Machine Details, CRUD by detail ID (modal edit, etc.) ---
router.get('/details/:detailId', machineDetailsController.getDetailById);
router.patch('/details/:detailId', machineDetailsController.patchDetail);
router.delete('/details/:detailId', machineDetailsController.deleteDetail);

module.exports = router;
