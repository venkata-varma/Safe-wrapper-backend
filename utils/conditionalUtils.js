const moment = require('moment')
const axios = require('axios')
const integrationServiceAPIConfig = require('../config/integrationsConfiguration')
const { CPDAuthentication } = require('./serviceProvidersAuthentication')
const integrationsMasterServiceProvidersModel = require('../models/integrationsMasterServiceProvidersModel')
const { decryptData } = require('./encryptionAlgorithms')
const serviceProviderListModel = require('../models/serviceProviderList')


let getCPDWorkOrderStatuses = async () => {
    const serviceProvider = await serviceProviderListModel.findOne({ serviceProviders: "CPD" });
    return serviceProvider ? serviceProvider.workOrderStatus : [];
};

const getAuthTokenForCPD = async(integrationsMasterId, accountId) => {
    const integrationObject = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationsMasterId, accountId: accountId, serviceProvider: "CPD" })
    // Find integration credentails and then decrypt and pull CPD calls.
    const encrypted = { iv: process.env.CRYPTO_IV, encryptedData: integrationObject.credentials };
    const decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
    const corrigoToken = await CPDAuthentication(decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, decryptConfigCredentials.grant_type, decryptConfigCredentials.baseUrl, integrationObject);
    return {corrigoToken, MessageId:decryptConfigCredentials.MessageId}
}

const getServiceDateRanges = async() => {
    let currentDate = moment();
    let formattedFromDate = moment(currentDate).subtract(28, 'days').startOf('day');
    let formattedToDate  = moment().endOf('day');
    fromDate = formattedFromDate.format('YYYY-MM-DDTHH:mm:ss');
    toDate   = formattedToDate.format('YYYY-MM-DDTHH:mm:ss');
    return {fromDate, toDate}
}


const ApplyConditions = async(serviceType, integrationsMasterId, accountId, condition, previousStatusCPDstatus = [])=>  {
    let {fromDate, toDate} = await getServiceDateRanges()
    let CPDstatus = previousStatusCPDstatus;

    if(serviceType === "status")
        CPDstatus = await statusBasedConditions(condition);
    if(serviceType === "dateRange"){
        [fromDate, toDate] = await dateRangeBasedConditions(condition);
        // If no previous "status" condition was applied, reset CPDstatus
        if (CPDstatus.length === 0) {
            CPDstatus = [];  // Reset CPDstatus for dateRange only
        }
    }
    const getCPDAuthToken = await getAuthTokenForCPD(integrationsMasterId, accountId)
    const getWO = await getWOFromCPD(fromDate, toDate, CPDstatus, getCPDAuthToken.corrigoToken, getCPDAuthToken.MessageId)
    return {getWO, updatedCPDstatus: CPDstatus }
}
const getWOFromCPD = async(fromDate, toDate, requiredStatus, corrigoToken, MessageId) => {
    // console.log('serviceLogic:===',requiredStatus)

    const CPDWorkOrderResponse = await axios.post(integrationServiceAPIConfig.CPD.workOrderSearch.URL,
        // CPDConfigurations.CPD.workOrderSearch.body,
        {
            "Parameters": {
                //"WorkOrderNumber":"POS4L20001", /*Search by work order number
                /* Search by'Created', 'AcknowledgeBy', 'OnSiteBy', 'DueDate', 'LastUpdate'*/
                
                "Created": {
                    "From": fromDate,
                    "To": toDate
                    // "From": "2024-07-01T00:00:00",
                    // "To":    "2024-07-28T23:59:59"
                },

                /*Search by work order status -> New,Accepted,Recalled,Rejected,CheckedIn,Paused,CheckedOut,OnHold,Verified,NeedsCompletionDetails*/
                "Statuses": requiredStatus
                //,"CustomerId" :"90256"
            },
            "MessageId": MessageId
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

const statusBasedConditions = async(condition) => {

        if(condition.serviceCondition === "equalsTo"){
            return condition.serviceLogicValues
        }
        else if(condition.serviceCondition === "notEqualsTo"){
            let getWorkOrderStatuses = await getCPDWorkOrderStatuses()
            const filteredServiceLogicValues = getWorkOrderStatuses.filter((item)=> {return !condition.serviceLogicValues.includes(item)})
            return filteredServiceLogicValues
        }
    
}

const dateRangeBasedConditions = async(condition) => {
        if(condition.serviceCondition === "between"){
            console.log('serviceCondition:===',condition.serviceLogicValues)
            return condition.serviceLogicValues
        }
        else if(condition.serviceCondition === "notBetween"){
            let [startDate, endDate] = condition.serviceLogicValues
            let getDays = new Date(endDate).getDate() - new Date(startDate).getDate()
            let currentDate = moment(startDate);
            let formattedFromDate = moment(currentDate).subtract((30-getDays), 'days').startOf('day');
            let formattedToDate  = moment(startDate).endOf('day');
            fromDate = formattedFromDate.format('YYYY-MM-DDTHH:mm:ss');
            toDate   = formattedToDate.format('YYYY-MM-DDTHH:mm:ss');
            console.log('Dates:====',fromDate, toDate)
            return [fromDate, toDate]
        }
}

module.exports = {
    ApplyConditions
}