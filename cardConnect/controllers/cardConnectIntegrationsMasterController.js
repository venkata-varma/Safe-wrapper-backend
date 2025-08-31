const asyncWrapper = require('../middleware/asyncWrapper');
const mongoose = require('mongoose')
const cardconnectIntegrationsMastersModel = require('../models/cardConnectIntegrationsMasterModel')
const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const cardConnectIntegrationsAPIUrlsFlowModel = require('../models/cardConnectIntegrationsAPIUrlFlowModel')
const cardConnectAPIUrlFlowModel = require('../models/cardConnectAPIUrlFlowsModel')
const cardConnectTransactionsModel = require('../models/cardConnectTransactionsModel')
const cardConnectIntegrationsCronsModel = require('../models/cardConnectIntegrationsCronsModel')
const customConstants = require('../../config/constants.json')
const { validateServiceProviders } = require('../../utils/credentialsValidation')
const { authenticationResponse, processAPIUrlFlows, initiateManualTrigger } = require('../utils/authenticationResponse')
const {
    encryptData,
    decryptData,
} = require("../../utils/encryptionAlgorithms");
const { modifyUrl } = require('../utils/authenticationResponse');
const { default: axios } = require('axios');
const cardConnectIntegrationsMasterModel = require('../models/cardConnectIntegrationsMasterModel');
const { generateDateRange, generateDateArray } = require('../utils/helpers');
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
exports.createCardConnectIntegrationsAPIUrlFlow = asyncWrapper(async (req, res) => {
    let { cardConnectIntegrationsMasterId } = req.params;
    let integrationMasterDetails = req.integrationMasterDetails;
    const fetchAPIUrlFLows = await cardConnectAPIUrlFlowModel.find({});


    const apiUrlFlows = fetchAPIUrlFLows.map(rec => {
        let obj = rec.toObject();    // convert Mongoose doc to plain object
        delete obj._id;
        delete obj.cardConnectAPIUrlsFlowId;             // remove _id so Mongoose will generate a new one
        return obj;
    });

    let createIntegrationAPIUrlFlow = await cardConnectIntegrationsAPIUrlsFlowModel.create({
        cardConnectIntegrationsMasterId,
        accountId: integrationMasterDetails.accountId,
        userId: integrationMasterDetails.userId,
        APIUrlFlows: apiUrlFlows,
        createdBy: req.user._id
    });






    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATION_API_URL_FLOWS_SAVED,

        });



})

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


exports.validateintegrationsMasterExistAndActive = asyncWrapper(async (req, res, next) => {
    const { cardConnectIntegrationsMasterId } = req.params;

    console.log('cardConnectIntegrationsMasterId:===', cardConnectIntegrationsMasterId);
    const integrationMasterDetails = await cardconnectIntegrationsMastersModel.findById(cardConnectIntegrationsMasterId)
    if (!integrationMasterDetails || integrationMasterDetails.status !== 'active') {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_DETAILS_NOT_FOUND_OR_DEACTICATED,
        });
    }

    next()

});



/**
 * 
 * 
 */
exports.editCardConnectIntegrationsMaster = asyncWrapper(async (req, res) => {
    let { cardConnectIntegrationsMasterId, accountId, userId, ...newDetails } = req.body;
    //let { cardConnectIntegrationsMasterId } = req.params;
    let editIntegrationsMaster = await cardconnectIntegrationsMastersModel.findByIdAndUpdate(cardConnectIntegrationsMasterId, { $set: { ...newDetails } }, { new: true, runValidators: true });

    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_EDITED_INTEGRATION_MASTER_SUCCESS,
            data: { editIntegrationsMaster },
        });

})


/**
 * 
 */
exports.editIntegrationsMasterCredentials = asyncWrapper(async (req, res) => {
    let { cardConnectIntegrationsMasterId } = req.params
    let { cardConnectIntegrationsMasterCredentialsId, accountId, userId, credentials, ...otherCredentials } = req.body;
    let prepareReqObj = {
        ...otherCredentials,
        credentials: encryptData(credentials),
        updatedBy: req.user._id
    }
    let editIntegrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.findByIdAndUpdate(cardConnectIntegrationsMasterCredentialsId,
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
    let { cardConnectIntegrationsMasterId } = req.params
    let { cardConnectIntegrationsMasterSettingsId, accountId, userId, ...newSettings } = req.body;
    console.log("newSettings==", newSettings)
    let prepareReqObj = {
        ...newSettings,
        updatedBy: req.user._id
    }
    let editIntegrationsMasterSettings = await cardConnectIntegrationsSettingsModel.findByIdAndUpdate(cardConnectIntegrationsMasterSettingsId,
        prepareReqObj, { new: true, runValidators: true }
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


exports.fetchFundingTransactionsForTheDay = asyncWrapper(async (req, res) => {
    let { date } = req.body;
    let { cardConnectIntegrationsMasterId } = req.params;
    let integrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.findOne({ cardConnectIntegrationsMasterId });




    let getAuthenticated = await authenticationResponse(cardConnectIntegrationsMasterId);
    console.log("getAuthenticated===", getAuthenticated)

    let integrationAPIUrlFlows = await cardConnectIntegrationsAPIUrlsFlowModel.findOne({ cardConnectIntegrationsMasterId, status: "active" });



    let apiUrlFlows = integrationAPIUrlFlows.APIUrlFlows;


    let processFlows = await processAPIUrlFlows(apiUrlFlows, getAuthenticated, integrationsMasterCredentials, date, req);
    console.log("processFlows===", processFlows)


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_FETCHED_FUNDING_FOR_THE_DAY,
            data: {
                ...processFlows
            },
        });




})



exports.manualPullDateDumpRange = asyncWrapper(async (req, res) => {
    const { cardConnectIntegrationsMasterId } = req.params;
    let integrationsMasterDetails = await cardconnectIntegrationsMastersModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(cardConnectIntegrationsMasterId)
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationscredentials",
                localField: "_id",
                foreignField: "cardConnectIntegrationsMasterId",
                as: "cardconnectintegrationscredentials"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationsapiurlflows",
                localField: "_id",
                foreignField: "cardConnectIntegrationsMasterId",
                as: "cardconnectintegrationsapiurlflows"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationssettings",
                localField: "_id",
                foreignField: "cardConnectIntegrationsMasterId",
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
    dateRange[2] = '20250825';

    //-------------------------




    let createIntegrationsCron = await cardConnectIntegrationsCronsModel.create({
        cardConnectIntegrationsMasterId: req.params.cardConnectIntegrationsMasterId,
        accountId: integrationsMasterDetails[0].accountId,
        userId: integrationsMasterDetails[0].userId,
        dateRange,
        cronJobType: "manual"
    })


    let initiateManualPull = await initiateManualTrigger(dateRange, integrationsMasterDetails[0], cardConnectIntegrationsMasterId, req, createIntegrationsCron._id);

    await cardConnectIntegrationsMasterModel.findByIdAndUpdate(cardConnectIntegrationsMasterId, { $set: { lastPullDate: new Date(), lastIntgerationsCronId: createIntegrationsCron._id } }, { new: true, runValidators: true })


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
            data: {
                initiateManualPull
            },
        });

})



/**
 * 
 */
exports.fetchFundingTransactionsForTheDateRange = asyncWrapper(async (req, res) => {
    let { fromDate, toDate } = req.body
    let { cardConnectIntegrationsMasterId } = req.params
//------------------------------

    let integrationsMasterDetails = await cardconnectIntegrationsMastersModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(cardConnectIntegrationsMasterId)
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationscredentials",
                localField: "_id",
                foreignField: "cardConnectIntegrationsMasterId",
                as: "cardconnectintegrationscredentials"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationsapiurlflows",
                localField: "_id",
                foreignField: "cardConnectIntegrationsMasterId",
                as: "cardconnectintegrationsapiurlflows"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationssettings",
                localField: "_id",
                foreignField: "cardConnectIntegrationsMasterId",
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
        cardConnectIntegrationsMasterId: req.params.cardConnectIntegrationsMasterId,
        accountId: integrationsMasterDetails[0].accountId,
        userId: integrationsMasterDetails[0].userId,
        dateRange:generatedDateArray,
        cronJobType: "manual"
    })


    let initiateManualPull = await initiateManualTrigger(generatedDateArray, integrationsMasterDetails[0], cardConnectIntegrationsMasterId, req, createIntegrationsCron._id);

    await cardConnectIntegrationsMasterModel.findByIdAndUpdate(cardConnectIntegrationsMasterId, { $set: { lastPullDate: new Date(), lastIntgerationsCronId: createIntegrationsCron._id } }, { new: true, runValidators: true })


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
            data: {
                fromDate, toDate,
                cardConnectIntegrationsMasterId: cardConnectIntegrationsMasterId,
                initiateManualPull
            },
        });
})