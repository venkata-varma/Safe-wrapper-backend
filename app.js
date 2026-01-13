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

// Database Connection
mongooseConnect.DbConnect();


// Routes  
const accountsRoute = require('./customer/routes/accountsRoute');
const usersRoute = require('./customer/routes/usersRoute');

const errorcontroller = require('./customer/controllers/errorcontroller');
const webHooksRoute = require('./customer/routes/webHooksRoute')
const webhookCrons = require('./customer/controllers/webhookCronControllers')
const integrationCrons = require('./cardConnect/controllers/cardConnectCronScheduleController')

const squarePOSDataPointsRoute = require('./squarePOS/routes/squarePOSDataPointsRoute')

//Super Admin Routes.

const SuperAdminAccountRoutes = require('./superAdmin/routes/superAdminAccounts')
const superAdminUserRoutes = require('./superAdmin/routes/userRoute')
const superAdminWebhookRoutes = require('./superAdmin/routes/superAdminWebhookRoutes')
const superAdminWebhookOperations = require('./superAdmin/routes/webhookOperationRoutes')
const cardConnectIntegrationsMasterRoute = require('./cardConnect/routes/cardConnectIntegrationsMasterRoute')

const cardConnectIntegrationsMasterDataPointsRoute = require('./cardConnect/routes/cardConnectIntegrationsMasterDataPointsRoute')

//Square POS 
const SquarePOSRoutes = require('./squarePOS/routes/squarePOSIntegrationRoute')
const squarePOSScheduleCronJobs = require('./squarePOS/controllers/squarePOSCronScheduleController');



//Provide the static images 
app.use('/static', express.static(path.join(__dirname, 'assets')));

app.use('/api/merchants/accounts', accountsRoute);
app.use('/api/merchants/users', usersRoute);
app.use('/api/merchants/machines', webHooksRoute)
app.use('/api/square-pos', SquarePOSRoutes)
app.use('/api/square-pos/data-points', squarePOSDataPointsRoute)

//Super Admin
app.use('/api/accounts', SuperAdminAccountRoutes)
app.use('/api/users', superAdminUserRoutes)
app.use('/api/machines', superAdminWebhookRoutes)
app.use('/api/webhook', superAdminWebhookOperations)
app.use('/api/card-connect/integrations-master', cardConnectIntegrationsMasterRoute)

app.use('/api/card-connect/data-points', cardConnectIntegrationsMasterDataPointsRoute)

// Start of swagger configuration

const yaml = require('js-yaml');
let swaggerjsdoc = require('swagger-jsdoc')
let swaggerexpressui = require('swagger-ui-express')
let fs = require('fs')

app.use(express.static(path.join(__dirname, 'swaggerDocumentationFiles')));
//const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, 'swagger.yaml'), 'utf8'));
const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, 'swaggerDocumentationFiles', 'swagger.yaml'), 'utf8'));

app.use('/api-docs', swaggerexpressui.serve, swaggerexpressui.setup(swaggerDocument, { customCssUrl: "/swagger-custom.css" }));


// End of swagger configuration


squarePOSScheduleCronJobs.squarePOSScheduleCronJobs()
webhookCrons.webhookScheduleCronJobs()
integrationCrons.cardConnectScheduleCronJobs()


// Error Handling Middleware (optional)
app.use(errorcontroller);


app.listen(8201, () => {
    console.log(`Server is working on port 8201`);
});

module.exports = app;
