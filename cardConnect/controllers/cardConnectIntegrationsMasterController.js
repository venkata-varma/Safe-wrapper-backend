const asyncWrapper = require('../../middleware/asyncWrapper');
const cardconnectIntegrationsMastersModel = require('../models/cardConnectIntegrationsMasterModel')
const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const customConstants = require('../../config/constants.json')
const { validateServiceProviders } = require('../../utils/credentialsValidation')
const {
    encryptData,
    decryptData,
} = require("../../utils/encryptionAlgorithms");
//------------------------------------------------------------------------------------


exports.validatecreateCardConnectIntegrationsMaster = asyncWrapper(async (req, res, next) => {
    let payload = req.body;
    if (!payload.title) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_PAYLOAD_MANDATORY_ERROR_TITLE
        });
    }

    if (!payload.accountId) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_PAYLOAD_MANDATORY_ERROR_ACCOUNTID
        });
    }

    if (!payload.userId) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_PAYLOAD_MANDATORY_ERROR_USERID
        });
    }
    next()
})




/**
 * 
 * 
 */
exports.createCardConnectIntegrationsMaster = asyncWrapper(async (req, res) => {
    const cardConnectIntegrationsMaster = await cardconnectIntegrationsMastersModel.create({
        ...req.body,
        createdBy: req.user._id,
        updatedBY: req.user._id,
        stepCount: 1
    });

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_CREATED_CARD_CONNECT_INTEGRATIONS_MASTER,
        data: {
            cardConnectIntegrationsMaster
        }
    })
})


/**
 * 
 */
exports.validateintegrationsMasterExist = asyncWrapper(async (req, res, next) => {
    const { cardConnectIntegrationsMasterId } = req.body;

    console.log('cardConnectIntegrationsMasterId:===', cardConnectIntegrationsMasterId)
    const integrationMasterDetails = await cardconnectIntegrationsMastersModel.findById(cardConnectIntegrationsMasterId)
    if (!integrationMasterDetails) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND,
        });
    }

    next()

});



/**
 * 
 * 
 */
exports.credentialsValidationsMiddleware = asyncWrapper(async (req, res, next) => {
    const { cardConnectIntegrationsMasterId } = req.body;

    let credentialsValidation = await validateServiceProviders(req.body)
    // console.log("credentialsValidation===validated", credentialsValidation)

    if (credentialsValidation.status === "fail" || credentialsValidation === undefined || credentialsValidation.statusCode !== 200) {
        return res.status(credentialsValidation?.statusCode).json({
            status: credentialsValidation?.status,
            statusCode: credentialsValidation?.statusCode,
            statusText: credentialsValidation?.statusText,
            message: credentialsValidation?.message,
            data: credentialsValidation?.data
        })
    }
    next()
});



/**
 * 
 * 
 */
exports.createIntegrationMasterCredentials = asyncWrapper(async (req, res, next) => {
    const { cardConnectIntegrationsMasterId, accountId, credentials } = req.body;

    let prepareReqObj = {
        ...req.body,
        credentials: encryptData(req.body.credentials),
        status: "verified",
        createdBy: req.user._id,
        updatedBy: req.user._id

    }
    let createCardConnectIntegrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.create(prepareReqObj);
    let updateIntegrationMasterDetails = await cardconnectIntegrationsMastersModel.findByIdAndUpdate(cardConnectIntegrationsMasterId, {
        $inc: { stepCount: 1 },
        $set: {
            source: "card-connect",
            updatedBy: req.user._id
        }
    },
        { runValidators: true, new: true })



    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATION_CREDENTIALS_SAVED,
            data: { updateIntegrationMasterDetails },
        });


});


/**
 * 
 */
exports.updateIntegrationMasterSettings = asyncWrapper(async (req, res) => {
    let { cardConnectIntegrationsMasterId } = req.body;
    let createCardConnectIntegrationsSettings = await cardConnectIntegrationsSettingsModel.create({
        ...req.body,
        createdBy: req.user._id,

    });
    // Perform the update
    let updatedIntegrationsDetails = await cardconnectIntegrationsMastersModel.findByIdAndUpdate(
        cardConnectIntegrationsMasterId,
        {
            $inc: { stepCount: 1 },
            $set: {

                updatedBy: req.user._id
            }
        },
        { new: true, runValidators: true, } // Options to return the updated document
    );
    updatedIntegrationsDetails = await cardconnectIntegrationsMastersModel.findOneAndUpdate({ _id: cardConnectIntegrationsMasterId, stepCount: 3 }, { status: "active" }, { new: true, runValidators: true })


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATIONS_SETTINGS,
            data: { updatedIntegrationsDetails },
        });



})