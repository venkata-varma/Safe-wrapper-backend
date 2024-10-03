const moment = require('moment')
const axios = require('axios')
const integrationServiceAPIConfig = require('../config/integrationsConfiguration')
const { CPDAuthentication } = require('./serviceProvidersAuthentication')
const integrationsMasterServiceProvidersModel = require('../models/integrationsMasterServiceProvidersModel')
const { decryptData } = require('./encryptionAlgorithms')

const getAuthTokenForCPD = async(integrationsMasterId, accountId) => {
    const integrationObject = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationsMasterId, accountId: accountId, serviceProvider: "CPD" })
    // Find integration credentails and then decrypt and pull CPD calls.
    const encrypted = { iv: process.env.CRYPTO_IV, encryptedData: integrationObject.credentials };
    const decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
    const corrigoToken = await CPDAuthentication(decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, decryptConfigCredentials.grant_type, decryptConfigCredentials.baseUrl, integrationObject);
    return corrigoToken
}

const getServiceDateRanges = async() => {
    let currentDate = moment();
    let formattedFromDate = moment(currentDate).subtract(28, 'days').startOf('day');
    let formattedToDate  = moment().endOf('day');
    fromDate = formattedFromDate.format('YYYY-MM-DDTHH:mm:ss');
    toDate   = formattedToDate.format('YYYY-MM-DDTHH:mm:ss');
    return {fromDate, toDate}
}

const getWOFromCPD = async(fromDate, toDate, serviceLogic, corrigoToken) => {
    console.log('serviceLogic:===',serviceLogic)

    const CPDWorkOrderResponse = await axios.post(integrationServiceAPIConfig.CPD.workOrderSearch.URL,
        // CPDConfigurations.CPD.workOrderSearch.body,
        {
            "Parameters": {
                //"WorkOrderNumber":"POS4L20001", /*Search by work order number
                /* Search by'Created', 'AcknowledgeBy', 'OnSiteBy', 'DueDate', 'LastUpdate'*/
                "Created": {
                    // "From": fromDate,
                    // "To": toDate
                    "From": "2024-07-01T00:00:00",
                    "To":    "2024-07-28T23:59:59"
                    // "To": "2024-02-14T24:00:00.000Z"
                },

                /*Search by work order status -> New,Accepted,Recalled,Rejected,CheckedIn,Paused,CheckedOut,OnHold,Verified,NeedsCompletionDetails*/
                "Statuses": serviceLogic
                //,"CustomerId" :"90256"
            },
            "MessageId": "f6b492c9-ee7d-4e1b-a9a8-29f50f0b6d3a"
        },
        {
            headers: { Authorization: `bearer ${corrigoToken}` }
        })
        .then(res => {
            console.log('response:==',)
            return res
        })
        .catch(async (error) => {
            console.log("ERROR:==",)
            return error
            // await exceptionLogs(integrationObject, error.response.status, error.response.data.Message, error.name, error.config.data, 'cpd-search-workorder', CPDWorkOrderId = "", CPDWorkOrderNumber = "", runnigWorkOrderId = "")
        });
        // console.log('CPDWorkOrderResponse:====',CPDWorkOrderResponse)
        return CPDWorkOrderResponse.data.WorkOrders
}

const conditionalOperations = async(integrationsMasterId, accountId, conditions) => {
    const getCPDAuthToken = await getAuthTokenForCPD(integrationsMasterId, accountId)
    let workOrdersData = []
    console.log('getCPDAuthToken:===',getCPDAuthToken)
    for(let conditon of conditions){
        if(conditon.serviceCondition === "equalsTo"){
            console.log('serviceCondition:===',conditon.serviceCondition)
            if(conditon.serviceType === "status"){
                console.log('serviceType:===',conditon.serviceType)
                const getServiceDates = await getServiceDateRanges()
                const getWO =  await getWOFromCPD(getServiceDates.fromDate, getServiceDates.toDate, conditon.serviceLogic, getCPDAuthToken)
                workOrdersData.push(getWO)
            }
        }
        else if(conditon.serviceCondition === "between"){
            console.log('serviceCondition:===',conditon.serviceCondition)
            if(conditon.serviceType === "dateRange"){
                console.log('serviceType:===',conditon.serviceType)
                // const getServiceDates = await getServiceDateRanges()
                const getWO = await getWOFromCPD(conditon.serviceLogic[0], conditon.serviceLogic[1], conditon.serviceLogic = [], getCPDAuthToken)
                workOrdersData.push(getWO)
            }
        }
    }
    return workOrdersData
}


module.exports = {
    conditionalOperations
}