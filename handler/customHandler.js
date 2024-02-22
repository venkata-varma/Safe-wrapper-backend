'use strict';
const app = require('../app');
const serverless = require('serverless-http');
const { DbConnect } = require('../config/dbConnection');
DbConnect();

module.exports.handler = serverless(app);