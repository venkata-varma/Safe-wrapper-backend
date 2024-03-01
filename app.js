const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongooseConnect = require('./config/dbConnection')
const app = express()
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(bodyParser.json())
// mongooseConnect.DbConnect()

app.use(cors());

const workOrderRoute = require('./routes/workOrderRoute')

app.use('/api', workOrderRoute);

module.exports = app;