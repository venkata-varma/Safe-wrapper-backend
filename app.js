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

//Provide the static images 
app.use('/static', express.static(path.join(__dirname, 'assets')));

app.use('/api/accounts', accountsRoute);
app.use('/api/users', usersRoute);
app.use('/api/webhook',webHooksRoute)

// webhookCrons.webhookScheduleCronJobs()

// Error Handling Middleware (optional)
app.use(errorcontroller);
//insertGlobalConstants()

app.listen(8201, () => {
    console.log(`Server is working on port 8201`);
});

module.exports = app;
