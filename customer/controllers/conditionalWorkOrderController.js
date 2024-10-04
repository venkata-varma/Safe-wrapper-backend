const { default: axios } = require("axios");
const asyncWrapper = require("../../middleware/asyncWrapper");
const { decryptData } = require("../../utils/encryptionAlgorithms");
const { CPDAuthentication } = require("../../utils/serviceProvidersAuthentication");
const CPDConfigurations = require('../../config/integrationsConfiguration');
const customConstants = require('../../config/constants.json')
const integrationsMasterServiceProvidersModel = require("../../models/integrationsMasterServiceProvidersModel");
const { ApplyConditions } = require("../../utils/conditionalUtils");


exports.searchWOsByConditions = asyncWrapper(async (req, res) => {
    const { integrationsMasterId, accountId } = req.query
    const { fromDate, toDate, Statuses } = req.body

    const integrationObject = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationsMasterId, serviceProvider: "CPD" })
    // Find integration credentails and then decrypt and pull CPD calls.
    const encrypted = { iv: process.env.CRYPTO_IV, encryptedData: integrationObject.credentials };
    const decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
    const corrigoToken = await CPDAuthentication(decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, decryptConfigCredentials.grant_type, decryptConfigCredentials.baseUrl, integrationObject);
    // Get work orders from the CPD - API calls.
    const CPDWorkOrderResponse = await axios.post(CPDConfigurations.CPD.workOrderSearch.URL,
        // CPDConfigurations.CPD.workOrderSearch.body,
        {
            "Parameters": {
                //"WorkOrderNumber":"POS4L20001", /*Search by work order number
                /* Search by'Created', 'AcknowledgeBy', 'OnSiteBy', 'DueDate', 'LastUpdate'*/
                "Created": {
                    "From": fromDate,
                    "To": toDate
                    // "To": "2024-02-14T24:00:00.000Z"
                },

                /*Search by work order status -> New,Accepted,Recalled,Rejected,CheckedIn,Paused,CheckedOut,OnHold,Verified,NeedsCompletionDetails*/
                "Statuses": Statuses
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
    // If you have atlease one work workorder from CPD then process.
    if (CPDWorkOrderResponse.status !== 200) {
        return res.status(customConstants.statusCodes.UNHANDLED_EXCEPTION).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_GET_WORKORDERS_FAILED,
            data: CPDWorkOrderResponse
        })
    }
    else {
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_GET_WORKORDERS,
            data: CPDWorkOrderResponse.data.WorkOrders
        });
    }

});

exports.getWorkOrdersBasedOnConditions = asyncWrapper(async(req,res)=>{
    const {integrationsMasterId, accountId, conditions} = req.body
    console.log('integrationsMasterId:===',integrationsMasterId)
    let getConditionalBasedWO
    for(let condition of conditions){
        getConditionalBasedWO = await ApplyConditions(condition.serviceType, integrationsMasterId, accountId, condition);
    }
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_WORKORDERS,
        data: getConditionalBasedWO
    });
});