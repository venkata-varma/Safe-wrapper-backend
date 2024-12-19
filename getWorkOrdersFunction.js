require('dotenv').config();
const { default: axios } = require('axios');
const mongooseConnect = require('./config/dbConnection');
mongooseConnect.DbConnect();

const { getCPDWorkOrders } = require("./middleware/CPDOperations");
const integrationsMasterModel = require("./models/integrationsMasterModel");
const integrationsMasterServiceProvidersModel = require('./models/integrationsMasterServiceProvidersModel');
const { decryptData } = require('./utils/encryptionAlgorithms');
const { CPDAuthentication } = require('./utils/serviceProvidersAuthentication');

async function start() {

    // await getCPDWorkOrders()
    let integrationsMasterId = '676140c001979eab3b11c7ad'
    let integrationMasterInfo = await integrationsMasterModel.findOne({ _id: integrationsMasterId, status: "active" });
    let sourceInfo = await integrationsMasterServiceProvidersModel.findOne({integrationsMasterId: integrationsMasterId, serviceProvider: integrationMasterInfo.from}).lean()
    // console.log(sourceInfo);
    // getSourceObjects
    await getWorkOrders(sourceInfo)
}

async function getWorkOrders(integrationObject) {

    
    // decryption technique
    let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: integrationObject.credentials };
    let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
     
    // suppose authentication existed CPD TO SNOW
    let authenticationInfo = await getAuthentication(integrationObject, decryptConfigCredentials)
    
    integrationObject.MessageId = decryptConfigCredentials.MessageId

    // getAuthentication();
    // authentication not required df and cyrious because we are sending credentials in header
    await getServiceProviderWorkOrder(integrationObject, authenticationInfo)
    // getwork orders
    // find get work orders url
    // get object using path
    // field mapping based on dynamic field
    // prepare source object
}


async function getServiceProviderWorkOrder(integrationObject, authenticationInfo)
{
    
    
    await axios.request({
        method: 'POST', // or 'POST', 'PUT', 'DELETE', etc.
        url: 'https://am-api.corrigopro.com/Direct/api/workOrder/search', // The URL to make the request to
        headers: {
          'Content-Type': 'application/json', // Custom headers
          Authorization: `Bearer ${authenticationInfo.token}`, // For example, a Bearer token
        },
        params: { },
        data: getPayload(integrationObject),
      })
        .then(response => {
          console.log('Response data:', response.data); // Handle success
        })
        .catch(error => {
          console.error('Error:', error.message); // Handle errors
        });
}

function getPayload(sourceObject) {


    if(sourceObject.serviceProvider == "CPD") {
        return {
            "Parameters": {
              
              "Created": {
                "From": "2024-12-01T12:03:46.831Z",
                "To": "2024-12-18T12:03:46.831Z"
              },
            },
            "MessageId": sourceObject.MessageId
          }
    }
}

async function getAuthentication(sourceObject, decryptConfigCredentials)
{
     
    if(sourceObject.serviceProvider == "CPD") {
        let {client_id, client_secret, grant_type, baseUrl} = decryptConfigCredentials
        try {
            let authenticationStatus = await axios.post(baseUrl, new URLSearchParams({client_id, client_secret, grant_type}))
            let {access_token:token, token_type, expires_in} = authenticationStatus.data
            return {token, token_type, expires_in}
            
        } catch (error) {
            console.log('Something wrong in CPD Authentication');
            
        }
    }
}

/*
async function getServiceProviderWorkOrder(url, authenticationDetails, isHeaderEnabled = false) {
    
    // let requestObject = {
    //     method: 'GET', // or 'POST', 'PUT', 'DELETE', etc.
    //     url: 'https://example.com/api', // The URL to make the request to
    //     headers: {
    //       'Content-Type': 'application/json', // Custom headers
    //       Authorization: 'Bearer your-token', // For example, a Bearer token
    //     },
    //     params: {
    //       key1: 'value1', // Query parameters (for GET requests)
    //       key2: 'value2',
    //     },
    //     data: {
    //       // Request body (for POST/PUT requests)
    //       field1: 'value1',
    //       field2: 'value2',
    //     },
    //   } 
}
    */

start();