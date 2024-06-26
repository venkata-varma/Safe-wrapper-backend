const express = require('express');
require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path')
const mongooseConnect = require('./config/dbConnection');
const app = express();
// const {insertGlobalConstants}=require('./controllers/workOrdersController')
// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(`${__dirname}/uploads`));
// Database Connection
mongooseConnect.DbConnect();

// Routes  
const accountsRoute = require('./routes/accountsRoute');
const usersRoute = require('./routes/usersRoute');
const integrationsRoute = require('./routes/integrationsMasterRoute');
const workOrderRoute = require('./routes/workOrderRoute');
const errorcontroller = require('./controllers/errorcontroller');

//Provide the static images 
app.use('/static', express.static(path.join(__dirname, 'assets')));

app.use('/api/accounts', accountsRoute);
app.use('/api/users', usersRoute);
app.use('/api/integrations', integrationsRoute);
app.use('/api/workOrders', workOrderRoute);
const integrationsSchedules = require('./controllers/schedulerController');
const DFintegrations = require('./middleware/DFOperations')

integrationsSchedules.integrationsScheduleCronJobsForEachMinute()
DFintegrations.DFCreateWorkorders()

// Error Handling Middleware (optional)
app.use(errorcontroller);
//insertGlobalConstants()

app.listen(8081, () => {
    console.log("Server is working on port 8081");
});

module.exports = app;
