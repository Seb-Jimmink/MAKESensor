// app.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const machineRouter = require('./routers/machinesRouter.js');
const componentsRouter = require('./routers/componentsRouter.js');
const sensorRouter = require('./routers/sensorRouter.js');
const firmwareRouter = require('./routers/firmwareRouter.js');
const hierarchyRouter = require('./routers/hierarchyRouter.js');

const app = express();

const protocol = process.env.FRONTEND_PROTOCOL; // 'http'
const hostname = process.env.FRONTEND_IP;       // '192.168.178.214'
const port = process.env.FRONTEND_PORT;         // '8088'

const frontendOrigin = `${protocol}://${hostname}:${port}`;
console.log(`Frontend orgin is ${frontendOrigin}`);

app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/machines', machineRouter);
app.use('/api/components', componentsRouter);
app.use('/api/sensor', sensorRouter);
app.use('/api/firmware', firmwareRouter);
app.use('/api/hierarchy', hierarchyRouter);

module.exports = app;
