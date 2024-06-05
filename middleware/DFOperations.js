
const DFConfigurations = require('../config/integrationsConfiguration')

// exports.searchWorkOrders = async () => {

//     const DFWorkOrdersSearch = axios.post('api.dataforma.com/dflowslope-api/workorders/search',
//         {
//             headers: {
//                 // Authorization: `bearer ${corrigoToken.access_token}`
//                 // df-auth : 
//             }
//         })
//     console.log('DFWorkOrdersSearch:===', DFWorkOrdersSearch)
// }

const axios = require('axios');
const CPDWorkordersModel = require('../models/workOrdersModels/CPDWorkordersModel');
let data = JSON.stringify({
    "dateCreatedOnAfter": "2024-03-04"
});

let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.dataforma.com/dflowslope-api/workorders/search?page=1&limit=20',
    headers: {
        'df-auth': 'ad7412b5-1928-49b9-a237-aa43d764bec4',
        'df-servicecode': 'mds552',
        'Content-Type': 'application/json',
        'Cookie': 'AWSALB=DGf1rqUADBR0x43HDX6TmdYgk92IjmyK3W1bQeNnFzbO0+GDi1NUNmB0zQlOVOjt+BNKwErFLx2+ecCKc0uB0ZWQDjvtV1aSUXdWvBvtwM4k1AthfVVWJryDJ2GP; AWSALBAPP-0=_remove_; AWSALBAPP-1=_remove_; AWSALBAPP-2=_remove_; AWSALBAPP-3=_remove_; AWSALBCORS=DGf1rqUADBR0x43HDX6TmdYgk92IjmyK3W1bQeNnFzbO0+GDi1NUNmB0zQlOVOjt+BNKwErFLx2+ecCKc0uB0ZWQDjvtV1aSUXdWvBvtwM4k1AthfVVWJryDJ2GP'
    },
    data: data
};

// axios.request(config)
// .then((response) => {
//   console.log(JSON.stringify(response.data));
// })
// .catch((error) => {
//   console.log(error);
// });

let createWorkOrderConfig = {
    method: 'post',
    maxBodyLength: Infinity,
    url: DFConfigurations.DF.createWorkOrder.URL,
    headers: DFConfigurations.DF.createWorkOrder.headers,
    data: JSON.stringify(DFConfigurations.DF.createWorkOrder.body)
};

exports.DFCreateWorkorders = async (integrationObject) => {

    // console.log('DFintegrationObject:==',integrationObject)
    if(integrationObject !== undefined){
        const CPDWorkOrderDetails = await CPDWorkordersModel.find({integrationsMasterId : integrationObject.integrationsMasterId, accountId : integrationObject.accountId}).limit(1).lean();
    // console.log('CPDWorkOrderDetails:==',CPDWorkOrderDetails)
    CPDWorkOrderDetails.forEach((item)=>{
        let getWorkOrdersDetails = item.CPDWorkOrders
        let createWorkOrderConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: DFConfigurations.DF.createWorkOrder.URL,
            headers: DFConfigurations.DF.createWorkOrder.headers,
            // data: JSON.stringify(DFConfigurations.DF.createWorkOrder.body)
            data : {          
                "assignedTo": item.CPDWorkOrders.WorkOrderNumber,
                "budgetAmount": 0, 
                "budgetNotes": "",
                "budgetedProposedContactId": 0,
                "budgetedProposedStatus": "NONE",
                "buildingId": 1715,
                "contractAmount": 0,
                "contractNotes": "",
                "customId": 0,
                "customerPurchaseOrderId": 0,
                "departmentId": "",
                "divisionId": 0, 
                "doNotExceed": "",
                "estimatorId": 0,
                "foremanId": 0,
                "invoiceToCustomerId": 2238,
                "invoiceToText": "",
                "invoiceType": "EXTERNAL_CHARGE",
                "locationId": item.CPDWorkOrders.BranchId,
                "notes": "",
                "numberAlt": "",
                "numberClient": `${item.CPDWorkOrders.Customer.Id}`,
                "questionsToId": 0,
                "reportToAltId": 0,
                "reportToId": 0,
                "reportedById": 5515,
                "runningNotes": "",
                "salesmanagerId": 0,
                "salespersonId": 0,
                "sourceListId": 0,
                "status": "IN_PROGRESS",
                "subsourceListId": 0,
                "subtypeListId": 0,
                "typeListId": 687,
                "workDescription": "DevRabbit Testing WorkOrders (Ignore)."          
              },
        };
        axios.request(createWorkOrderConfig)
            .then((response) => {
                console.log("response:===",JSON.stringify(response.data));
            })
            .catch((error) => {
                console.log("ERROR:==",error.response.data);
            });
    })
    
    }
}