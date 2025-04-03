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

webhookCrons.webhookScheduleCronJobs()

// Error Handling Middleware (optional)
app.use(errorcontroller);
//insertGlobalConstants()


// Start of swagger configuration

const yaml = require('js-yaml');
let swaggerjsdoc=require('swagger-jsdoc')
let swaggerexpressui=require('swagger-ui-express')
let fs=require('fs')

app.use(express.static(path.join(__dirname, 'swaggerDocumentationFiles')));
 //const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, 'swagger.yaml'), 'utf8'));
 const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, 'swaggerDocumentationFiles', 'swagger.yaml'), 'utf8'));

app.use('/api-docs', swaggerexpressui.serve, swaggerexpressui.setup(swaggerDocument, { customCssUrl: "/swagger-custom.css"  }));


// End of swagger configuration


app.listen(8201, () => {
    console.log(`Server is working on port 8201`);
});





module.exports = app;
