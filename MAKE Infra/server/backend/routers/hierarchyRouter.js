// hierarchyRouter.js

const express = require('express');
const router = express.Router();
const controller = require('../controllers/hierarchyController');

router.get('/', controller.getHierarchy);

module.exports = router;
