const asyncWrapper = require('../middleware/asyncWrapper');
const mongoose = require('mongoose')

const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const cardConnectIntegrationsAPIUrlsFlowModel = require('../models/cardConnectIntegrationsAPIUrlFlowModel')

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
 * 
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
    console.log("accountDetails===", accountDetails)
    if (!accountDetails || accountDetails.status !== 'active') {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_NOT_EXISTS_INACTIVE,
        });
    }

    next()

});

/**
 * 
 */
exports.validateAccountExistAndActiveParams = asyncWrapper(async (req, res, next) => {
    const { accountId } = req.params;


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
 * 
 */
exports.validateintegrationsMasterExistenceParams = asyncWrapper(async (req, res, next) => {
    const { cardConnectIntegrationsMasterId } = req.params;

    console.log('cardConnectIntegrationsMasterId:===', cardConnectIntegrationsMasterId)
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
 * 
 * 
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
    req.payload = payload;
    next()
});



/**
 * 
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
    let createCardConnectIntegrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.create(prepareReqObj);


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATION_CREDENTIALS_SAVED,
            data: { createCardConnectIntegrationsMasterCredentials },
        });


});


/**
 * 
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
            message: customConstants.messages.MESSAGE_INTEGRATION_API_URL_FLOWS_SAVED,
            data: {
                createIntegrationAPIUrlFlow
            }
        });



})

/**
 * 
 */
exports.createCardConnectIntegrationMasterSettings = asyncWrapper(async (req, res) => {

    let createCardConnectIntegrationsSettings = await cardConnectIntegrationsSettingsModel.create({
        ...req.body,
        createdBy: req.user._id,
        transactionStatusKeys: cardConnectPredefinedKeys.transactionStatusKeys,
        transactionTypeKeys: cardConnectPredefinedKeys.transactionTypeKeys,
        requiredDatapoints: cardConnectPredefinedKeys.requiredDatapoints,
        customerObjectKeys: cardConnectPredefinedKeys.customerObjectKeys
    });


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATIONS_SETTINGS,
            data: { createCardConnectIntegrationsSettings },
        });



})


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
 * 
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
    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_EDITED_INTEGRATION_MASTER_CREDENTIALS_SUCCESS,
            data: { editIntegrationsMasterCredentials },
        });


})

/**
 * 
 */
exports.editIntegrationsMasterSettings = asyncWrapper(async (req, res) => {

    let { cardConnectIntegrationsSettingId, accountId, userId, ...newSettings } = req.body;
    let findExistenceOfIntegrationSettingsRecord = await cardConnectIntegrationsSettingsModel.findById(cardConnectIntegrationsSettingId);
    if (!findExistenceOfIntegrationSettingsRecord) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_SETTINGS_RECORD_NOT_FOUND,
        });
    }
    console.log("newSettings==", newSettings)
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
            data: { editIntegrationsMasterSettings },
        });


})




/**
 * 
 */
// exports.fetchFundingTransactionsForTheDay = asyncWrapper(async (req, res) => {
//     let { date } = req.body;
//     let { cardConnectIntegrationsMasterId } = req.params;
//     let integrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.findOne({ cardConnectIntegrationsMasterId });




//     let getAuthenticated = await authenticationResponse(cardConnectIntegrationsMasterId);
//     console.log("getAuthenticated===", getAuthenticated)



//     let baseUrl = 'https://{{site}}.cardconnect.com/cardconnect/rest/funding?merchid={{merchid}}&date={{date}}';
//     let prepareUrlWithPKV = await modifyUrl(baseUrl, integrationsMasterCredentials, date)
//     console.log("prepareUrlWithPKV===", prepareUrlWithPKV)
//     let allTxns = [];
//     let page = 1;
//     let totalInserted = 0;

//     while (true) {
//         let finalUrl = `${prepareUrlWithPKV}&page=${page}&limit=10000`;

//         let response = await axios.get(finalUrl, {
//             headers: getAuthenticated?.requestMethod === "headers" ? getAuthenticated.responseData : {},
//             data: getAuthenticated?.requestMethod === "body" ? getAuthenticated.responseData : {}
//         });

//         let txns = response.data.txns || [];
//         if (txns.length === 0) break;

//         if (txns.length > 0) {
//             // prepare bulk insert objects
//             let recordsToInsert = txns.map(txn => ({
//                 cardConnectIntegrationsMasterId: req.params.cardConnectIntegrationsMasterId,
//                 accountId: integrationsMasterCredentials.accountId,
//                 userId: integrationsMasterCredentials.userId,
//                 transaction: txn,
//                 status: txn.status,
//                 transactionType: txn.type,
//                 createdBy: req.user._id
//             }));

//             // bulk insert
//             await cardConnectTransactionsModel.insertMany(recordsToInsert, { ordered: false });
//             totalInserted += recordsToInsert.length;
//         }



//         console.log(`Fetched page ${page}, ${txns.length} records`);
//         page++;

//         // Only wait if you're going to fetch the next page
//         await new Promise(res => setTimeout(res, 3100));
//     }

//     console.log(`Total Inserted: ${totalInserted}`);
//     res.json({ message: "Funding transactions fetched and stored", totalInserted });


// })


/**
 * 
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
        cronJobType: "manual"
    })

    await cardConnectIntegrationsSettingsModel.findOneAndUpdate({ accountId }, { $set: { lastPullDate: new Date(), lastIntgerationsCronId: createIntegrationsCron._id } }, { new: true, runValidators: true })


    //---------------------------=----------------------



    let getAuthenticated = await authenticationResponse(accountId);
    console.log("getAuthenticated===", getAuthenticated)

    let integrationAPIUrlFlows = await cardConnectIntegrationsAPIUrlsFlowModel.findOne({ accountId, status: "active" });



    let apiUrlFlows = integrationAPIUrlFlows.APIUrlFlows.filter((url) => url.status === 'active');
    console.log("apiUrlFlows.length===", apiUrlFlows.length)

    let processFlows = await processAPIUrlFlows(apiUrlFlows, getAuthenticated, integrationsMasterCredentials, date, createIntegrationsCron._id);
    console.log("processFlows===", processFlows)



    await cardConnectIntegrationsCronsModel.findByIdAndUpdate(createIntegrationsCron._id,
        {
            $set: {

                status: "completed"

            }
        }, { new: true, runValidators: true })



    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_FETCHED_FUNDING_FOR_THE_DAY,
            // data: {
            //     ...processFlows
            // },
        });




})



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
    console.log("dateDumpRange===", dateDumpRange)

    let dateRange = generateDateRange(dateDumpRange);
    console.log("dateRange===", dateRange)

    //-------------------------




    let createIntegrationsCron = await cardConnectIntegrationsCronsModel.create({

        accountId: integrationsMasterDetails[0].accountId,
        userId: integrationsMasterDetails[0].userId,
        dateRange,
        cronJobType: "manual"
    })

    await cardConnectIntegrationsSettingsModel.findOneAndUpdate({ accountId }, { $set: { lastPullDate: new Date(), lastIntgerationsCronId: createIntegrationsCron._id } }, { new: true, runValidators: true })

    let initiateManualPull = await initiateManualTrigger(dateRange, integrationsMasterDetails[0], accountId, createIntegrationsCron._id);



    await cardConnectIntegrationsCronsModel.findByIdAndUpdate(createIntegrationsCron._id,
        {
            $set: {

                status: "completed"

            }
        }, { new: true, runValidators: true })


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_PERFORMED_MANUAL_TRIGGER_SINGLE_INTEGRATION,
            // data: {
            //     initiateManualPull
            // },
        });

})



/**
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
    console.log("generatedDateArray===", generatedDateArray)


    let createIntegrationsCron = await cardConnectIntegrationsCronsModel.create({

        accountId: integrationsMasterDetails[0].accountId,
        userId: integrationsMasterDetails[0].userId,
        dateRange: generatedDateArray,
        cronJobType: "manual"
    })

    await cardConnectIntegrationsSettingsModel.findOneAndUpdate({ accountId }, { $set: { lastPullDate: new Date(), lastIntgerationsCronId: createIntegrationsCron._id } }, { new: true, runValidators: true })


    let initiateManualPull = await initiateManualTrigger(generatedDateArray, integrationsMasterDetails[0], accountId, createIntegrationsCron._id);


    await cardConnectIntegrationsCronsModel.findByIdAndUpdate(createIntegrationsCron._id,
        {
            $set: {

                status: "completed"

            }
        }, { new: true, runValidators: true })



    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_PERFORMED_MANUAL_TRIGGER_SINGLE_INTEGRATION,

        });
})


