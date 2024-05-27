const express = require('express');
require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongooseConnect = require('./config/dbConnection');
const app = express();
// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Database Connection
mongooseConnect.DbConnect();

// Routes
const accountsRoute = require('./routes/accountsRoute');
const usersRoute = require('./routes/usersRoute');
const integrationsRoute = require('./routes/integrationsMasterRoute');
const workOrderRoute = require('./routes/workOrderRoute')
app.use('/api/accounts', accountsRoute);
app.use('/api/users', usersRoute);
app.use('/api/integrations', integrationsRoute);
app.use('/api/workOrders', workOrderRoute);


// Error Handling Middleware (optional)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


app.listen(8081, () => {
    console.log("Server is working on port 8081");
});


module.exports = app;
