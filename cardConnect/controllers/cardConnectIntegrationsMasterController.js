const asyncWrapper = require('../middleware/asyncWrapper');
const mongoose = require('mongoose')

const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const cardConnectIntegrationsAPIUrlsFlowModel = require('../models/cardConnectIntegrationsAPIUrlFlowModel')
let cardConnectExceptionsModel = require('../models/cardConnectExceptionsModel')
const cardConnectTransactionsModel = require('../models/cardConnectTransactionsModel')
const cardConnectIntegrationsCronsModel = require('../models/cardConnectIntegrationsCronsModel')
const customConstants = require('../../config/constants.json')
const { validateServiceProviders } = require('../../utils/credentialsValidation')
const accountsModel = require('../../models/accountsModel')
const { authenticationResponse, processAPIUrlFlows, initiateManualTrigger } = require('../utils/authenticationResponse')
const {
    encryptData,
    decryptData,
} = require("../../utils/encryptionAlgorithms");
const { modifyUrl } = require('../utils/authenticationResponse');
const { default: axios } = require('axios');

const { generateDateRange, generateDateArray } = require('../utils/helpers');
const { cardConnectPredefinedKeys } = require('../config/predefinedKeys')
//------------------------------------------------------------------------------------




/**
 * Middleware for Validating existence of "accountId" in payload (body)
 * If validation is passed, then function call is passed to next immediate function of respective end-point
 */
exports.validateAccountExistAndActive = asyncWrapper(async (req, res, next) => {
    const { accountId } = req.body;

    if (!accountId) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNTID_MISSING_FOR_VALIDATION,
        });
    }
    const accountDetails = await accountsModel.findById(accountId);

    if (!accountDetails || accountDetails.status !== 'active') {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_NOT_EXISTS_INACTIVE,
        });
    }

    next()

});


/**
 * Middleware for Validating existence of "accountId" in params
 * If validation is passed, then function call is passed to next immediate function of respective end-point
 */
exports.validateAccountExistAndActiveParams = asyncWrapper(async (req, res, next) => {
    const { accountId } = req.params;
    if (!accountId) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ID_MANDATORY_PARAMS,
        });
    }

    const accountDetails = await accountsModel.findById(accountId);

    if (!accountDetails || accountDetails.status !== 'active') {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_NOT_EXISTS_INACTIVE,
        });
    }

    next()

});


/**
  * Middleware for Validating existence of "cardConnectIntegrationsMasterId" in params
  * If validation is passed, then function call is passed to next immediate function of respective end-point
 */
exports.validateintegrationsMasterExistenceParams = asyncWrapper(async (req, res, next) => {
    const { cardConnectIntegrationsMasterId } = req.params;

    const integrationMasterDetails = await cardconnectIntegrationsMastersModel.findById(cardConnectIntegrationsMasterId)
    if (!integrationMasterDetails) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND,
        });
    }
    req.integrationMasterDetails = integrationMasterDetails;
    next()

});


/**
 * Middleware for validation of Card-connect credentials entered by customer.
 * Values for few keys such as "authorizationType", etc; are hard-coded as said.
 * If credentials are not valid, Error will be thrown. Else, will be stored in card-connect credentials model
 */
exports.credentialsValidationsMiddleware = asyncWrapper(async (req, res, next) => {
    var payload;
    if (req.body.source === 'card-connect') {
        payload = {
            ...req.body,
            authorizationType: "Basic auth",
            authenticationKey: "Authorization",
            dataMappingPath: [],
        }
    }

    let credentialsValidation = await validateServiceProviders(payload)


    if (credentialsValidation.status === "fail" || credentialsValidation === undefined || credentialsValidation.statusCode !== 200) {
        return res.status(credentialsValidation?.statusCode).json({
            status: credentialsValidation?.status,
            statusCode: credentialsValidation?.statusCode,
            statusText: credentialsValidation?.statusText,
            message: credentialsValidation?.message,
            data: credentialsValidation?.data
        })
    }
    req.payload = payload;
    next()
});



/**
 * Function call will be passed to this function only if middleware function called "credentialsValidationsMiddleware" is passed & successful. 
 * 
 */
exports.createIntegrationMasterCredentials = asyncWrapper(async (req, res, next) => {
    const payload = req.payload;

    let prepareReqObj = {
        ...payload,
        credentials: encryptData(payload.credentials),
        status: "verified",
        createdBy: req.user._id,


    }
    let findExistingCardConnectCredentialsForAccount = await cardconnectIntegrationsCredentialsModel.findOne({ accountId: payload?.accountId })
    if (findExistingCardConnectCredentialsForAccount) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_CARD_CONNECT_AUTHENTICATION_ALREADY_EXISTS_FOR_ACCOUNT,

        });
    }
    let createCardConnectIntegrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.create(prepareReqObj);
    //------Insert API service
    let insertAPIUrl = cardConnectPredefinedKeys?.APIUrls?.uat?.[0];

    await cardConnectIntegrationsAPIUrlsFlowModel.findOneAndUpdate(
        { accountId: req.payload.accountId },
        {
            accountId: req.payload.accountId,
            userId: req.payload.userId,
            APIUrlFlows: insertAPIUrl,   // ALWAYS replace with file
            updatedBy: req.payload.userId,
        },
        { upsert: true, new: true }
    );


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATION_CREDENTIALS_SAVED,
            data: {
                cardConnectIntegrationsMasterCredentials: createCardConnectIntegrationsMasterCredentials
            },
        });


});


/**
 * Below API service will be immediately called after credentials are authorized, and stored.
 * A pre-defined service record is stored in "PredefinedKeys" file.
 * It will be fixed for Account Id which is intending to onboard card-connect integrations
 */
exports.fixDefaultAPIUrlForCardConnect = asyncWrapper(async (req, res) => {
    let { accountId } = req.params;

    let insertAPIUrl = cardConnectPredefinedKeys?.APIUrls?.[0];

    await cardConnectIntegrationsAPIUrlsFlowModel.findOneAndUpdate(
        { accountId },
        {
            accountId,
            userId: req?.user?._id,
            APIUrlFlows: insertAPIUrl,   // ALWAYS replace with file
            updatedBy: req?.user?._id
        },
        { upsert: true, new: true }
    );

    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATION_API_URL_SERVICES_SAVED
        });
});


/**
 * Front-end does - not exists .
 * Need to write a "GET API" immediately after credentials are stored and to be redirected to settings screen.
 */
exports.createCardConnectIntegrationsAPIUrlFlow = asyncWrapper(async (req, res) => {
    let payload = req.body;

    let createIntegrationAPIUrlFlow = await cardConnectIntegrationsAPIUrlsFlowModel.create({

        accountId: payload.accountId,
        userId: payload.userId,
        APIUrlFlows: payload.APIUrlFlows,
        createdBy: req.user._id
    });


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATION_API_URL_SERVICES_SAVED,
            data: {
                createIntegrationAPIUrlFlow
            }
        });



})

/**
 * Front-end screen exists for giving values to settings for card-connect integration.
 */
exports.createCardConnectIntegrationMasterSettings = asyncWrapper(async (req, res) => {
    let findExistingCardConnectSettingsForAccount = await cardConnectIntegrationsSettingsModel.findOne({ accountId: req?.body?.accountId })
    if (findExistingCardConnectSettingsForAccount) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_CARD_CONNECT_SETTINGS_ALREADY_EXISTS_FOR_ACCOUNT,

        });
    }
    let createCardConnectIntegrationsSettings = await cardConnectIntegrationsSettingsModel.create({
        ...req.body,
        createdBy: req.user._id,
        transactionStatusKeys: cardConnectPredefinedKeys.transactionStatusKeys,
        transactionTypeKeys: cardConnectPredefinedKeys.transactionTypeKeys,
        requiredDatapoints: cardConnectPredefinedKeys.requiredDatapoints,
        customerObjectKeys: cardConnectPredefinedKeys.customerObjectKeys   //Not useful as of now
    });


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATIONS_SETTINGS,
            data: {
                cardConnectIntegrationsSettings: createCardConnectIntegrationsSettings
            },
        });

})


/**
 * End-point to get 
 */
exports.getIntegrationsAPIUrlFlows = asyncWrapper(async (req, res) => {
    const { accountId } = req.params;
    const getAPIUrlFlows = await cardConnectIntegrationsAPIUrlsFlowModel.find({ accountId });

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_RETREIVED_API_URL_FLOWS_OF_INTEGRATION,
        data: {
            getAPIUrlFlows
        }
    });


})




/**
 * Front-end screen exists to edit card-connect credentials
 * Middleware function called "credentialsValidationMiddleware" is called to validate the credentials.
 * End-point's functionality to edit card-connect credentials
 */
exports.editIntegrationsMasterCredentials = asyncWrapper(async (req, res) => {

    let { cardConnectIntegrationsCredentialsId, accountId, userId, credentials, ...otherCredentials } = req.payload;
    let findExistenceOfIntegrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.findById(cardConnectIntegrationsCredentialsId);
    if (!findExistenceOfIntegrationsMasterCredentials) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_CREDENTIALS_RECORD_NOT_FOUND,
        });
    }

    let prepareReqObj = {
        ...otherCredentials,
        credentials: encryptData(credentials),
        updatedBy: req.user._id
    }
    let editIntegrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.findByIdAndUpdate(cardConnectIntegrationsCredentialsId,
        { $set: prepareReqObj }, { new: true, runValidators: true }
    )

    //------------------------Fixing default services in this step itself
    let upsertAPIUrl = cardConnectPredefinedKeys?.APIUrls?.uat?.[0];

    await cardConnectIntegrationsAPIUrlsFlowModel.findOneAndUpdate(
        { accountId: req.payload.accountId },
        {
            accountId: req.payload.accountId,
            userId: req.payload.userId,
            APIUrlFlows: upsertAPIUrl,   // ALWAYS replace with file
            updatedBy: req.payload.userId,
        },
        { upsert: true, new: true }
    );



    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_EDITED_INTEGRATION_MASTER_CREDENTIALS_SUCCESS,
            data: {
                cardConnectIntegrationsMasterCredentials: editIntegrationsMasterCredentials
            },
        });


})

/**
 * Front-end screen exists to edit card-connect settings
 * End-point's functionality to edit card-connect settings
 */
exports.editIntegrationsMasterSettings = asyncWrapper(async (req, res) => {

    let { cardConnectIntegrationsSettingId, accountId, ...newSettings } = req.body;
    let findExistenceOfIntegrationSettingsRecord = await cardConnectIntegrationsSettingsModel.findById(cardConnectIntegrationsSettingId);
    if (!findExistenceOfIntegrationSettingsRecord) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_SETTINGS_RECORD_NOT_FOUND,
        });
    }

    let prepareReqObj = {
        ...newSettings,
        updatedBy: req.user._id
    }
    let editIntegrationsMasterSettings = await cardConnectIntegrationsSettingsModel.findByIdAndUpdate(cardConnectIntegrationsSettingId,
        { $set: { ...prepareReqObj } }, { new: true, runValidators: true }
    )
    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_EDITED_INTEGRATION_MASTER_CREDENTIALS_SUCCESS,
            data: {
                cardConnectIntegrationsSettings: editIntegrationsMasterSettings
            },
        });


})




/**
 * Front-end screen does not exists for below end-point as said. 
 */
exports.editIntegrationsAPIUrlFlow = asyncWrapper(async (req, res) => {

    let { cardConnectIntegrationsAPIUrlFlowId, accountId, userId, APIUrlFlows } = req.body;

    let findExistenceOfIntegrationAPIUrlFlow = await cardConnectIntegrationsAPIUrlsFlowModel.findById(cardConnectIntegrationsAPIUrlFlowId);
    if (!findExistenceOfIntegrationAPIUrlFlow) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_API_URL_FLOW_RECORD_NOT_FOUND,
        });
    }


    let updatedIntegrationAPIUrlFlows = await cardConnectIntegrationsAPIUrlsFlowModel.findByIdAndUpdate(cardConnectIntegrationsAPIUrlFlowId,
        { $set: { APIUrlFlows, updatedBy: req.user._id } },
        { new: true, runValidators: true }
    )


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_EDITED_INTEGRATION_MASTER_API_URL_FLOWS_SUCCESS,
            data: { updatedIntegrationAPIUrlFlows },
        });
})



/**
 * Functionality is to call Card-connect Funding API live to get transactions for the given day.
 * Even if transactions are fetched, if they are already stored , they will not be stored
 * Front-end screen does not exists for below end-point.
 */
exports.fetchFundingTransactionsForTheDay = asyncWrapper(async (req, res) => {
    let { date } = req.body;
    let { accountId } = req.params;
    let integrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.findOne({ accountId });

    let dateRange = [];
    dateRange.push(date)

    //---------------------------------------------------------
    let createIntegrationsCron = await cardConnectIntegrationsCronsModel.create({

        accountId: integrationsMasterCredentials.accountId,
        userId: integrationsMasterCredentials.userId,
        dateRange,
        status: "initiated",
        cronJobType: "manual"
    })

    await cardConnectIntegrationsSettingsModel.findOneAndUpdate({ accountId }, { $set: { lastPullDate: new Date(), lastIntgerationsCronId: createIntegrationsCron._id } }, { new: true, runValidators: true })


    //---------------------------=----------------------



    let getAuthenticated = await authenticationResponse(accountId);


    let integrationAPIUrlFlows = await cardConnectIntegrationsAPIUrlsFlowModel.findOne({ accountId, status: "active" });



    let apiUrlFlows = integrationAPIUrlFlows.APIUrlFlows.filter((url) => url.status === 'active');


    let processFlows = await processAPIUrlFlows(apiUrlFlows, getAuthenticated, integrationsMasterCredentials, date, createIntegrationsCron._id);



    let finalCronDetails = await cardConnectIntegrationsCronsModel.findByIdAndUpdate(createIntegrationsCron._id,
        {
            $set: {

                status: "completed"

            }
        }, { new: true, runValidators: true })
    let cardConnectExceptionsOfCronCount = await cardConnectExceptionsModel.find({ cardConnectIntegrationsCronId: createIntegrationsCron._id }).countDocuments()


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_FETCHED_FUNDING_FOR_THE_DAY,
            data: {
                finalResult: {
                    accountId: finalCronDetails?.accountId,
                    cronId: finalCronDetails?._id,
                    cronJobType: finalCronDetails?.cronJobType,
                    dateRange: finalCronDetails?.dateRange,
                    // "Below are statistics related to newly stored / updated transactions of this particular activity. ",
                    totalFetchedTransactionsCount: finalCronDetails?.pulledCount,
                    newlyAddedTransactionsCount: finalCronDetails?.pushedCount,
                    updatedTransactionsCount: finalCronDetails?.updatedCount,
                    exceptionsCount: cardConnectExceptionsOfCronCount

                },

            }
        });




})


/**
 *  The key "Data dump range" of card-connect settings is used here . Based on it, Funding API of card -connect will be called for those days of that range
 * For every day, interval of 3 seconds of time is applied because, only 20 requests per minute is accepted by card-connect 
 * Front-end screen does not exists for below end-point. But, same code runs for Crons
 */
exports.manualPullDateDumpRange = asyncWrapper(async (req, res) => {
    const { accountId } = req.params;
    let integrationsMasterDetails = await accountsModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(accountId)
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationscredentials",
                localField: "_id",
                foreignField: "accountId",
                as: "cardconnectintegrationscredentials"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationsapiurlflows",
                localField: "_id",
                foreignField: "accountId",
                as: "cardconnectintegrationsapiurlflows"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationssettings",
                localField: "_id",
                foreignField: "accountId",
                as: "cardconnectintegrationssettings"
            }
        },
        { $unwind: "$cardconnectintegrationscredentials" },
        { $unwind: "$cardconnectintegrationsapiurlflows" },
        { $unwind: "$cardconnectintegrationssettings" }

    ])


    //----------------------------------


    let dateDumpRange = integrationsMasterDetails[0].cardconnectintegrationssettings.dataDumpRange;


    let dateRange = generateDateRange(dateDumpRange);

    let storeDateRange = dateRange.map((unformattedDate) => {
        return (
            unformattedDate.slice(0, 4) + "-" +    // year
            unformattedDate.slice(4, 6) + "-" +    // month
            unformattedDate.slice(6, 8)            // day
        );
    });
    //-------------------------




    let createIntegrationsCron = await cardConnectIntegrationsCronsModel.create({

        accountId: integrationsMasterDetails[0].accountId,
        userId: integrationsMasterDetails[0].userId,
        dateRange: storeDateRange,
        status: "initiated",
        cronJobType: "manual"
    })

    await cardConnectIntegrationsSettingsModel.findOneAndUpdate({ accountId }, { $set: { lastPullDate: new Date(), lastIntgerationsCronId: createIntegrationsCron._id } }, { new: true, runValidators: true })

    let initiateManualPull = await initiateManualTrigger(dateRange, integrationsMasterDetails[0], accountId, createIntegrationsCron._id);



    let finalCronDetails = await cardConnectIntegrationsCronsModel.findByIdAndUpdate(createIntegrationsCron._id,
        {
            $set: {

                status: "completed"

            }
        }, { new: true, runValidators: true })
    let cardConnectExceptionsOfCronCount = await cardConnectExceptionsModel.find({ cardConnectIntegrationsCronId: createIntegrationsCron._id }).countDocuments()


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_LIVE_FUNDING_DATA_DUMP_RANGE_OF_SETTINGS,
            data: {
                finalResult: {
                    accountId: finalCronDetails?.accountId,
                    cronJobType: finalCronDetails?.cronJobType,
                    cronId: finalCronDetails?._id,
                    dateRange: finalCronDetails?.dateRange,
                    // "Below are statistics related to newly stored / updated transactions of this particular activity. ",
                    totalFetchedTransactionsCount: finalCronDetails?.pulledCount,
                    newlyAddedTransactionsCount: finalCronDetails?.pushedCount,
                    updatedTransactionsCount: finalCronDetails?.updatedCount,
                    exceptionsCount: cardConnectExceptionsOfCronCount
                },

            }
        });

})



/**
 * Requires fromDate and toDate
 * Front-end screen gives only option for 7 days. So, all the between dates are extracted including given fromDate and toDate
 *  For every day, interval of 3 seconds of time is applied because, only 20 requests per minute is accepted by card-connect 
 *  
 */
exports.fetchFundingTransactionsForTheDateRange = asyncWrapper(async (req, res) => {
    let { fromDate, toDate } = req.body
    let { accountId } = req.params
    //------------------------------

    let integrationsMasterDetails = await accountsModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(accountId)
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationscredentials",
                localField: "_id",
                foreignField: "accountId",
                as: "cardconnectintegrationscredentials"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationsapiurlflows",
                localField: "_id",
                foreignField: "accountId",
                as: "cardconnectintegrationsapiurlflows"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationssettings",
                localField: "_id",
                foreignField: "accountId",
                as: "cardconnectintegrationssettings"
            }
        },
        { $unwind: "$cardconnectintegrationscredentials" },
        { $unwind: "$cardconnectintegrationsapiurlflows" },
        { $unwind: "$cardconnectintegrationssettings" }

    ])

    //----------------------------------
    let generatedDateArray = generateDateArray(fromDate, toDate)

    let storeDateRange = generatedDateArray.map((unformattedDate) => {
        return (
            unformattedDate.slice(0, 4) + "-" +    // year
            unformattedDate.slice(4, 6) + "-" +    // month
            unformattedDate.slice(6, 8)            // day
        );
    });
    let createIntegrationsCron = await cardConnectIntegrationsCronsModel.create({

        accountId: integrationsMasterDetails[0].accountId,
        userId: integrationsMasterDetails[0].userId,
        dateRange: storeDateRange,
        status: "initiated",
        cronJobType: "manual"
    })

    await cardConnectIntegrationsSettingsModel.findOneAndUpdate({ accountId }, { $set: { lastPullDate: new Date(), lastIntgerationsCronId: createIntegrationsCron._id } }, { new: true, runValidators: true })


    let initiateManualPull = await initiateManualTrigger(generatedDateArray, integrationsMasterDetails[0], accountId, createIntegrationsCron._id);



    let finalCronDetails = await cardConnectIntegrationsCronsModel.findByIdAndUpdate(createIntegrationsCron._id,
        {
            $set: {

                status: "completed"

            }
        }, { new: true, runValidators: true })
    let cardConnectExceptionsOfCronCount = await cardConnectExceptionsModel.find({ cardConnectIntegrationsCronId: createIntegrationsCron._id }).countDocuments()



    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_LIVE_FUNDING_DATA_DATE_RANGE,
            data: {
                finalResult: {
                    accountId: finalCronDetails?.accountId,
                    cronId: finalCronDetails?._id,
                    cronJobType: finalCronDetails?.cronJobType,
                    exceptionsCount: cardConnectExceptionsOfCronCount,
                    dateRange: finalCronDetails?.dateRange,
                    // "Below are statistics related to newly stored / updated transactions of this particular activity. ",
                    totalFetchedTransactionsCount: finalCronDetails?.pulledCount,
                    newlyAddedTransactionsCount: finalCronDetails?.pushedCount,
                    updatedTransactionsCount: finalCronDetails?.updatedCount
                },

            }
        });
})


