const { default: axios } = require("axios");
const asyncWrapper = require("../../middleware/asyncWrapper");
const { decryptData } = require("../../utils/encryptionAlgorithms");
const { CPDAuthentication } = require("../../utils/serviceProvidersAuthentication");
const CPDConfigurations = require('../../config/integrationsConfiguration');
const customConstants = require('../../config/constants.json')
const integrationsMasterServiceProvidersModel = require("../../models/integrationsMasterServiceProvidersModel");
const { ApplyConditions } = require("../../utils/conditionalUtils");
const conditionalModel = require('../../models/conditionalModel')

/**
 * Get Corrigo pro WorkOrders by conditions using Search WO API.
 * IntegrationsMasterId and accountId used to get the Auth token of CorrigoPro of required customer from integrationsMasterServiceProvider record.
 * Get the encrypted credentials and then decrypt.
 * Get the decrypted credentials from decryptData and then get Auth token from CPDAuthentication function.
 * Use Search work order API of Corrigo-pro to get the requires work orders.
 * @returns CPD Work Orders.
 */

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

/**
 * Get the required Corrigo-pro work orders from CPD by the condtions.
 * @returns Corrifo-pro work orders.
 */

exports.getWorkOrdersBasedOnConditions = asyncWrapper(async(req,res)=>{
    const {integrationsMasterId, accountId, conditions} = req.body
    console.log('integrationsMasterId:===',integrationsMasterId)
    let getConditionalBasedWO
    let CPDstatus = [];
    for(let condition of conditions){
        getConditionalBasedWO = await ApplyConditions(condition.serviceType, integrationsMasterId, accountId, condition, CPDstatus);
         // If the serviceType is "status", store the CPDstatus for subsequent use
         if (condition.serviceType === "status") {
            CPDstatus = getConditionalBasedWO.updatedCPDstatus;  // Preserve CPDstatus from the "status" condition
        }
    }
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_WORKORDERS,
        data: getConditionalBasedWO.getWO?.WorkOrders || []
    });
});

exports.validateConditionAlreadyExist = asyncWrapper(async(req,res,next)=>{
    const {accountId, integrationsMasterId, serviceProvider, conditions} = req.body;
    const findConditionIsAvailable = await conditionalModel.find({accountId:accountId, integrationsMasterId: integrationsMasterId, status:"active"})
    if(findConditionIsAvailable.length > 0){
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_FAIL_TO_ADD_CONDITION
        });
    }
    else{
        next()
    }
})

/**
 * This function is used to save the condtions requied by the customer.
 * If the condition already exist, delete the old record and insert new one.
 * Else save the condtion.
 */

exports.createConditions = asyncWrapper(async(req,res)=>{
    const {accountId, integrationsMasterId, serviceProvider, conditions} = req.body;
    
    await conditionalModel.create(req.body)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ADD_CONDITION
    });
})

/**
 * This function is used to returns the all condtions by integrstionsMasterId.
 * @returns all conditions.
 */
exports.getAllConditionsByIntegrationsMasterId = asyncWrapper(async(req,res)=>{
    const getAllConditions = await conditionalModel.find({accountId: req.params.accountId, status: "active"}).populate('integrationsMasterId').sort({_id:-1})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_ALL_CONDITIONS,
        data: getAllConditions
    });
});

/**
 * This function is used to update the status of condtion.
 */

exports.updateConditionStatus = asyncWrapper(async(req,res)=>{
    const conditionId = req.params.conditionId
    const {status} = req.body
    await conditionalModel.findByIdAndUpdate(conditionId,{status:status},{new: true})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_CONDITION_STATUS
    });
})

exports.validateConditionExist = asyncWrapper(async(req,res,next)=>{
    const {conditionId} = req.params
    const getConditionDetails = await conditionalModel.findById(conditionId).populate('integrationsMasterId')
    if(!getConditionDetails || getConditionDetails.status !== 'active' || getConditionDetails.integrationsMasterId.status !== 'active'){
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_FAIL_TO_EDIT_CONDITION
        });
    }
    else{
        next()
    }
});

exports.editCondition = asyncWrapper(async(req,res)=>{
    const {conditionId} = req.params
    
    await conditionalModel.findByIdAndUpdate(conditionId,{...req.body},{new: true})
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_CONDITION
    });
})

exports.getIndividualConditionDetails = asyncWrapper(async(req,res)=>{
    const{conditionId} = req.params
    const getConditionDetails = await conditionalModel.findById(conditionId).populate('integrationsMasterId')
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_SINGLE_CONDITION,
        data:getConditionDetails
    });
})