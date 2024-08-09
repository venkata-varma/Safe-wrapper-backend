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
app.use('/accountLogos', express.static(path.join(__dirname, 'accountLogos')));
// Database Connection
mongooseConnect.DbConnect();

// Routes  
const accountsRoute = require('./customer/routes/accountsRoute');
const usersRoute = require('./customer/routes/usersRoute');
const integrationsRoute = require('./customer/routes/integrationsMasterRoute');
const errorcontroller = require('./customer/controllers/errorcontroller');
//super-admin-routes
const superAdminAccountRoute = require('./superAdminPanel/superAdminRoutes/superAdminAccountsRoute')
const superAdminUsersRoute = require('./superAdminPanel/superAdminRoutes/superAdminUsersRoute')

//Provide the static images 
app.use('/static', express.static(path.join(__dirname, 'assets')));

app.use('/api/accounts', accountsRoute);
app.use('/api/users', usersRoute);
app.use('/api/integrations', integrationsRoute);
app.use('/api/super-admin/accounts', superAdminAccountRoute)
app.use('/api/super-admin/users', superAdminUsersRoute)
const integrationsSchedules = require('./customer/controllers/schedulerController');
const DFintegrations = require('./middleware/DFOperations')

integrationsSchedules.integrationsScheduleCronJobsForEachMinute()
DFintegrations.DFCreateWorkorders()

// Error Handling Middleware (optional)
app.use(errorcontroller);
//insertGlobalConstants()

app.listen(8090, () => {
    console.log("Server is working on port 8090");
});

module.exports = app;

const SNOWOperations = require('./middleware/SNOWOperations');
const integrationsFieldMappingModel = require('./models/integrationsFieldMappingModel');
const mongoose = require('mongoose')
const testSNow=async()=>{
const toCred=await integrationsFieldMappingModel.find({integrationsMasterId: new mongoose.Types.ObjectId("668fd9a91a785a4e7fe5d8ed"), to: "SNOW" }).lean();
console.log("roCred", toCred)
await SNOWOperations.SNOWCreateIncidents(toCred,"manual")
}

 testSNow()
// const newId = new mongoose.Types.ObjectId('668fd9c71a785a4e7fe5d93a')
// async function hp() {
//     const update = {
//         _id: newId,
//         fieldMappingId: newId,
//         accountId: new mongoose.Types.ObjectId('667d4177bc77277e43bc1e2f'),
//         userId: new mongoose.Types.ObjectId('667d4177bc77277e43bc1e31'),
//         integrationsMasterId: new mongoose.Types.ObjectId('668fd9a91a785a4e7fe5d8ed'),
//         from: 'CPD',
//         to: 'SNOW',
//         serviceMethod: 'create',
//         serviceName: 'work-order',
//         fieldMappingType: 'custom',
//         dataPoints: {
//             delivery_task: 'WorkDetails.Assets[0].Path',
//             due_date: 'Sla.DueDate',
//             impact: 'WorkDetails.Assets.Model.Name',
//             knowledge: 'WorkDetails.Specialty',
//             rfc: 'ServiceLocation.Address.Country',
//             short_description: 'WorkDetails.Specialty.Name',
//             sla_due: 'Sla.DueDate'
//         },
//         createdBy: new mongoose.Types.ObjectId('667d4177bc77277e43bc1e31'),
//         updatedBy: new mongoose.Types.ObjectId('667d4177bc77277e43bc1e31'),

//         __v: 0
//     }
//     console.log("Update", update)
//     const inseert =await integrationsFieldMappingModel.create(update)
//     console.log("uinsert", inseert)
//     // const toCred = await integrationsFieldMappingModel.find({ integrationsMasterId: new mongoose.Types.ObjectId("668fd9a91a785a4e7fe5d8ed"), to: "SNOW" }).lean();
//     // console.log("toCred", toCred)
// }
// hp()