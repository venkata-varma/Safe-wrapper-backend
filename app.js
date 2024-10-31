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
app.use('/devapps/Integration-assets', express.static(path.join(__dirname, '..', 'devapps', 'Integration-assets')));


// Database Connection
mongooseConnect.DbConnect();
 

// Routes  
const accountsRoute = require('./customer/routes/accountsRoute');
const usersRoute = require('./customer/routes/usersRoute');
const integrationsRoute = require('./customer/routes/integrationsMasterRoute');
const conditionalRoute = require('./customer/routes/conditionalRoute')
const errorcontroller = require('./customer/controllers/errorcontroller');
//super-admin-routes
const superAdminAccountRoute = require('./superAdminPanel/superAdminRoutes/superAdminAccountsRoute')
const superAdminUsersRoute = require('./superAdminPanel/superAdminRoutes/superAdminUsersRoute')
const serviceProvidersRoute = require('./superAdminPanel/superAdminRoutes/serviceProvidersOperations')
const fieldMappingsRoute = require('./superAdminPanel/superAdminRoutes/fieldMappingsRoute')
//Provide the static images 
app.use('/static', express.static(path.join(__dirname, 'assets')));

app.use('/api/accounts', accountsRoute);
app.use('/api/users', usersRoute);
app.use('/api/integrations', integrationsRoute);
app.use('/api/conditions', conditionalRoute);
app.use('/api/super-admin/accounts', superAdminAccountRoute);
app.use('/api/super-admin/users', superAdminUsersRoute);
app.use('/api/super-admin/service-provider',serviceProvidersRoute)
app.use('/api/super-admin/field-mappings',fieldMappingsRoute)

const integrationsSchedules = require('./customer/controllers/schedulerController');
const DFintegrations = require('./middleware/DFOperations');

integrationsSchedules.integrationsScheduleCronJobsForEachMinute()
DFintegrations.DFCreateWorkorders()

// Error Handling Middleware (optional)
app.use(errorcontroller);
//insertGlobalConstants()

app.listen(8090, () => {
    console.log("Server is working on port 8090");
});

module.exports = app;
