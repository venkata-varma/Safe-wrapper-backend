const asyncWrapper = require("../../middleware/asyncWrapper");
const webHooksModel = require("../../models/webHooksMasterModel");
const customConstants = require("../../config/constants.json");
const jwt = require("jsonwebtoken");
const {
  encryptData,
  decryptData,
} = require("../../utils/encryptionAlgorithms");
const webHooksMasterModel = require("../../models/webHooksMasterModel");
const webhookMetaPayloadModel = require("../../models/webHookMetaPayloads");
const { default: mongoose } = require("mongoose");
const moment = require("moment");
const { stringify } = require("flatted");
const accountsModel = require("../../models/accountsModel");
const webhookExceptionsModel = require("../../models/webhookExceptionsModel");
const { getWebHooksLogsSixWeekSalesData } = require("../../utils/accountInsightUtils");
const webhookPayloadTransactions = require("../../models/webhookPayloadTransactions");
const webhookPayloadHeaders = require("../../models/webhookPayloadHeaders");
const { getSixWeeksSalesFunction } = require('../../utils/sixWeeksTimeline');
const usersModel = require("../../models/usersModel");
const onePosLogsModel = require("../../models/onePosLogsModel");
const { dashboardFiltersCardConnect, dashboardFiltersSafeCash, getSummaryDetails } = require('./smartDashboardFunctions')
const { getMerchantCardConnectPayloadHeaders } = require('../../cardConnect/controllers/cardConnectIntegrationsMasterDataPointsController');
const cardConnectIntegrationsCredentialsModel = require("../../cardConnect/models/cardConnectIntegrationsCredentialsModel");
const cardConnectIntegrationsSettingsModel = require("../../cardConnect/models/cardConnectIntegrationsSettingsModel");



/**
 * Middleware function for Create webhook functionality
 * Middleware is to check the status of Respective account
 * If middleware is passed, control is passed to its next function
 */
exports.validateAccountStatusToCreateWebHook = asyncWrapper(
  async (req, res, next) => {
    const { accountId } = req.body;
    const accountDetails = await accountsModel.findOne({
      accountId: accountId,
    });
    if (!accountDetails || accountDetails.status !== "active") {
      return res.status(customConstants.statusCodes.BAD_REQUEST).json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
      });
    } else {
      next();
    }
  }
);

/**
 * Create webhook.
 * Initially validate the account whether it is in active or not.
 * Same validation for integration.
 * If both the conditions satisfied then webhook will be created or else returns the validation errors.
 */

exports.createWebHook = asyncWrapper(async (req, res) => {
  const { accountId } = req.body;
  const randomNumber = Math.floor(10000 + Math.random() * 90000);

  let webHookUrl = `${process.env.DOMAIN_NAME}api/webhook/${randomNumber}/${accountId}`;
  let webHookAuthenticationCode = `Bearer ${jwt.sign(
    { accountId: accountId },
    process.env.JWT_SECRET
  )}`;

  const encryptedWebHookAuthCode = encryptData({
    authenticationCode: webHookAuthenticationCode,
  });

  const defaultWebhookSettings = {
    periodType: "once each hour",
    currentStatus: "stop",
    interval: 1,
    expiresOn: new Date()
  };

  let createWebhook = await webHooksModel.create({
    ...req.body,
    userId: req.user._id,
    webHookUrl,
    authenticationCode: encryptedWebHookAuthCode,
    webhookSettings: defaultWebhookSettings
  });
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_ADD_WEBHOOK,
      createWebhook
    });
});

// /**
//  * This middleware verifies the account and integration exist.
//  */

// exports.validateIntegrationForWebHook = asyncWrapper(async (req, res, next) => {
//     const { accountId, integrationsMasterId, webHookId } = req.query

//     if (!accountId || !integrationsMasterId) {
//         return res.status(customConstants.statusCodes.BAD_REQUEST).json({
//             status: customConstants.messages.MESSAGE_FAIL,
//             message: customConstants.messages.MESSAGE_MISSING_IDS
//         });
//     }
//     const IntegrationMasterDetails = await integrationsMasterModel.findOne({ accountId: accountId, _id: integrationsMasterId }).populate('accountId')

//     if (IntegrationMasterDetails.accountId.status !== "active") {
//         return res.status(customConstants.statusCodes.BAD_REQUEST).json({
//             status: customConstants.messages.MESSAGE_FAIL,
//             message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED
//         });
//     }
//     if (IntegrationMasterDetails.status !== "active") {
//         return res.status(customConstants.statusCodes.BAD_REQUEST).json({
//             status: customConstants.messages.MESSAGE_FAIL,
//             message: customConstants.messages.MESSAGE_INTEGRATION_ID_NOT_ACTIVE
//         });
//     }
//     else {
//         next()
//     }

// })

// /**
//  * This function used to updates the webhook details.
//  */

// exports.updateWebHook = asyncWrapper(async (req, res) => {
//     const { accountId, integrationsMasterId, webHookId } = req.query
//     await webHooksModel.findOneAndUpdate({ accountId, integrationsMasterId, webHookId }, { ...req.body }, { new: true })
//     return res
//         .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
//         .json({
//             status: customConstants.messages.MESSAGE_SUCCESS,
//             message: customConstants.messages.MESSAGE_UPDATE_WEBHOOK
//         });
// })

// /**
//  * Get all webhooks by accountId, integrationsMasterId.
//  * This function is used to get the webhook details along with the webhook logs with the respective status of logs.
//  * Get the past 6 week statuses of webhook logs count.
//  * Get the overall statuses of webhook logs count by matching the accountID and integrationsMasterId.
//  */
// exports.getAllWebHooks = asyncWrapper(async (req, res) => {
//     const { accountId, integrationsMasterId } = req.query
//     // const getAllWebHooks = await webHooksModel.find({accountId,integrationsMasterId}).sort({_id:-1})

//     const statusesEnum = ['received','initiated','sent','delivered','failed','deleted'];
//     const getAllWebHooks = await webHooksModel.aggregate([
//         {
//             $match: {
//                 accountId: new mongoose.Types.ObjectId(accountId),
//                 integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId)
//             }
//         },
//         {
//             $lookup: {
//                 from: "webhooklogs",
//                 foreignField: "webHookId",
//                 localField: "_id",
//                 as: "webhookLogsDetails"
//             }
//         },
//         {
//             $unwind: {
//                 path: "$webhookLogsDetails",
//                 preserveNullAndEmptyArrays: true
//             }
//         },
//         {
//             $group: {
//                 _id: {
//                     webHookId: "$_id",
//                     status: "$webhookLogsDetails.status"
//                 },
//                 count: { $sum: 1 },
//                 webHookDetails: { $first: "$$ROOT" }
//             }
//         },
//         {
//             $group: {
//                 _id: "$_id.webHookId",
//                 webHookDetails: { $first: "$webHookDetails" },
//                 statuses: {
//                     $push: {
//                         status: "$_id.status",
//                         count: "$count"
//                     }
//                 }
//             }
//         },
//         {
//             $addFields: {
//                 statuses: {
//                     $map: {
//                         input: statusesEnum,
//                         as: "statusEnum",
//                         in: {
//                             status: "$$statusEnum",
//                             count: {
//                                 $reduce: {
//                                     input: "$statuses",
//                                     initialValue: 0,
//                                     in: {
//                                         $cond: [
//                                             { $eq: ["$$this.status", "$$statusEnum"] },
//                                             { $add: ["$$value", "$$this.count"] },
//                                             "$$value"
//                                         ]
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         },
//         {
//             $addFields: {
//                 "webHookDetails.webhookLogsDetails": "$$REMOVE", // Remove the `webhookLogsDetails` field
//                 "webHookDetails.statuses": "$statuses"
//             }
//         },
//         {
//             $replaceRoot: {
//                 newRoot: "$webHookDetails"
//             }
//         }
//         /*
//         {
//             $project: {
//                 // webHookDetails: {
//                 //     _id: 1,
//                 //     webHookId: "$webHookDetails._id",
//                 //     accountId: "$webHookDetails.accountId",
//                 //     integrationsMasterId: "$webHookDetails.integrationsMasterId",
//                 //     webHookName: "$webHookDetails.webHookName",
//                 //     webHookUrl: "$webHookDetails.webHookUrl",
//                 //     authenticationCode: "$webHookDetails.authenticationCode",
//                 //     status: "$webHookDetails.status",
//                 //     createdAt: "$webHookDetails.createdAt",
//                 //     updatedAt: "$webHookDetails.updatedAt",
//                 //     requestObject: "$webHookDetails.requestObject"
//                 // },
//                 webHookDetails: 1,
//                 // statuses: 1,
//                 _id: 0
//             }
//         }
//             */
//     ]);

//     const getWebHookLogs = await webHooksModel.aggregate([
//         {
//             $match: {
//                 accountId: new mongoose.Types.ObjectId(accountId),
//                 integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
//             }
//         },
//         {
//             $lookup: {
//                 from: "webhooklogs",
//                 foreignField: "webHookId",
//                 localField: "_id",
//                 as: "webhookLogsDetails"
//             }
//         }
//     ]);
//     const getPast6WeeksStatuses = await getWebHooksLogsSixWeekSalesData(getWebHookLogs)

//     const getOverallStatuses = await webHooksModel.aggregate([
//         {
//             $match: {
//                 accountId: new mongoose.Types.ObjectId(accountId),
//                 integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
//             }
//         },
//         {
//             $lookup: {
//                 from: "webhooklogs",
//                 foreignField: "webHookId",
//                 localField: "_id",
//                 as: "webhookLogsDetails"
//             }
//         },
//         {
//             $unwind: {
//                 path: "$webhookLogsDetails",
//                 preserveNullAndEmptyArrays: true
//             }
//         },
//         {
//             $group: {
//                 _id: "$webhookLogsDetails.status",
//                 count: { $sum: 1 }
//             }
//         },
//         {
//             $addFields: {
//                 status: "$_id",
//                 count: "$count",
//                 _id: 0
//             }
//         },
//         {
//             $group: {
//                 _id: null,
//                 statuses: { $push: { status: "$status", count: "$count" } }
//             }
//         },
//         {
//             $project: {
//                 _id: 0,
//                 mergedStatuses: {
//                     /*
//                     $map: {
//                         input: statusesEnum,
//                         as: "status",
//                         in: {
//                             status: "$$status",
//                             count: {
//                                 $ifNull: [
//                                     {
//                                         $arrayElemAt: [
//                                             {
//                                                 $filter: {
//                                                     input: "$statuses",
//                                                     as: "item",
//                                                     cond: [ {$eq: ["$$item.status", "$$status"]},
//                                                     { $add: ["$$value", "$$this.count"] },
//                                                     "$$value"
//                                                  ]
//                                                 }
//                                             },
//                                             0
//                                         ]
//                                     },
//                                     { count: 0 }
//                                 ]
//                             }
//                         }
//                     }
//                         */
//                     $map: {
//                         input: statusesEnum,
//                         as: "statusEnum",
//                         in: {
//                             status: "$$statusEnum",
//                             count: {
//                                 $reduce: {
//                                     input: "$statuses",
//                                     initialValue: 0,
//                                     in: {
//                                         $cond: [
//                                             { $eq: ["$$this.status", "$$statusEnum"] },
//                                             { $add: ["$$value", "$$this.count"] },
//                                             "$$value"
//                                         ]
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         },
//         {
//             $project: {
//                 statuses: "$mergedStatuses"
//             }
//         }
//     ]);

//     return res
//         .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
//         .json({
//             status: customConstants.messages.MESSAGE_SUCCESS,
//             message: customConstants.messages.MESSAGE_GET_ALL_WEBHOOK,
//             data: {
//                 webHooks: getAllWebHooks,
//                 pastSixWeeksData: getPast6WeeksStatuses,
//                 overallStatusesCount: getOverallStatuses[0]?.statuses || []
//             }
//         });
// })

// /**
//  * Get single webhook details by accountId, integrationsMasterId, webHookId along webhook logs statuses details.
//  * Validate the webhook exist or not.
//  * If not exist returns the validation error.
//  * Else returns the webhook data.
//  */
// exports.getIndividualWebHook = asyncWrapper(async (req, res) => {
//     const { accountId, integrationsMasterId, webHookId } = req.query
//     const webHookDetails = await webHooksModel.findOne({ _id: webHookId, accountId, integrationsMasterId }).lean()
//     if (!webHookDetails) {
//         return res.status(customConstants.statusCodes.BAD_REQUEST).json({
//             status: customConstants.messages.MESSAGE_FAIL,
//             message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND
//         });
//     }
//     else {
//         const statusesEnum = ['received','initiated','sent','delivered','failed','deleted'];
//         const getAllWebHooks = await webHooksModel.aggregate([
//             {
//                 $match: {
//                     _id: new mongoose.Types.ObjectId(webHookId),
//                     accountId: new mongoose.Types.ObjectId(accountId),
//                     integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId)
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "webhooklogs",
//                     foreignField: "webHookId",
//                     localField: "_id",
//                     as: "webhookLogsDetails"
//                 }
//             },
//             {
//                 $unwind: {
//                     path: "$webhookLogsDetails",
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             {
//                 $group: {
//                     _id: {
//                         webHookId: "$_id",
//                         status: "$webhookLogsDetails.status"
//                     },
//                     count: { $sum: 1 },
//                     webHookDetails: { $first: "$$ROOT" }
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$_id.webHookId",
//                     webHookDetails: { $first: "$webHookDetails" },
//                     statuses: {
//                         $push: {
//                             status: "$_id.status",
//                             count: "$count"
//                         }
//                     }
//                 }
//             },
//             {
//                 $addFields: {
//                     statuses: {
//                         $map: {
//                             input: statusesEnum,
//                             as: "statusEnum",
//                             in: {
//                                 status: "$$statusEnum",
//                                 count: {
//                                     $reduce: {
//                                         input: "$statuses",
//                                         initialValue: 0,
//                                         in: {
//                                             $cond: [
//                                                 { $eq: ["$$this.status", "$$statusEnum"] },
//                                                 { $add: ["$$value", "$$this.count"] },
//                                                 "$$value"
//                                             ]
//                                         }
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             },
//             {
//                 $addFields: {
//                     "webHookDetails.webhookLogsDetails": "$$REMOVE", // Remove the `webhookLogsDetails` field
//                     "webHookDetails.statuses": "$statuses"
//                 }
//             },
//             {
//                 $replaceRoot: {
//                     newRoot: "$webHookDetails"
//                 }
//             }
//             /*
//             {
//                 $project: {
//                     // webHookDetails: {
//                     //     _id: 1,
//                     //     webHookId: "$webHookDetails._id",
//                     //     accountId: "$webHookDetails.accountId",
//                     //     integrationsMasterId: "$webHookDetails.integrationsMasterId",
//                     //     webHookName: "$webHookDetails.webHookName",
//                     //     webHookUrl: "$webHookDetails.webHookUrl",
//                     //     authenticationCode: "$webHookDetails.authenticationCode",
//                     //     status: "$webHookDetails.status",
//                     //     createdAt: "$webHookDetails.createdAt",
//                     //     updatedAt: "$webHookDetails.updatedAt",
//                     //     requestObject: "$webHookDetails.requestObject"
//                     // },
//                     webHookDetails: 1,
//                     // statuses: 1,
//                     _id: 0
//                 }
//             }
//                 */
//         ]);
//         return res
//             .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
//             .json({
//                 status: customConstants.messages.MESSAGE_SUCCESS,
//                 message: customConstants.messages.MESSAGE_GET_INDIVIDUAL_WEBHOOK,
//                 data: getAllWebHooks[0]
//             });
//     }
// })

// /**
//  * Update the webhook status.
//  */
// exports.updateWebHookStatus = asyncWrapper(async (req, res) => {
//     const { accountId, integrationsMasterId, webHookId } = req.query
//     const { status } = req.body
//     console.log('req:===', req.query)
//     let webHookDetails

//     webHookDetails = await webHooksModel.findOne({ _id: webHookId, accountId: accountId, integrationsMasterId: integrationsMasterId }).lean()
//     console.log('webHookDetails:===', webHookDetails)

//     if (!webHookDetails) {
//         return res.status(customConstants.statusCodes.BAD_REQUEST).json({
//             status: customConstants.messages.MESSAGE_FAIL,
//             message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND
//         });
//     }
//     else {
//         if (status === 'delete') {
//             webHookDetails = await webHooksModel.findOneAndUpdate({ _id: webHookId, accountId: accountId, integrationsMasterId: integrationsMasterId }, { status: "deleted" }, { new: true })
//             return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
//                 status: customConstants.messages.MESSAGE_SUCCESS,
//                 message: customConstants.messages.MESSAGE_DELETE_WEBHOOK,
//             })
//         }
//         else if (status === 'active') {
//             webHookDetails = await webHooksModel.findOneAndUpdate({ _id: webHookId, accountId: accountId, integrationsMasterId: integrationsMasterId }, { status: "active" }, { new: true })
//             return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
//                 status: customConstants.messages.MESSAGE_SUCCESS,
//                 message: customConstants.messages.MESSAGE_ACTIVATE_WEBHOOK,
//             })
//         }
//         else if (status === 'offline') {
//             webHookDetails = await webHooksModel.findOneAndUpdate({ _id: webHookId, accountId: accountId, integrationsMasterId: integrationsMasterId }, { status: "offline" }, { new: true })
//             return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
//                 status: customConstants.messages.MESSAGE_SUCCESS,
//                 message: customConstants.messages.MESSAGE_WEBHOOK_OFFLINE,
//             })
//         }
//     }
// })

/**
 *
 */
const createWebhookException = async (
  accountId,
  webhookMasterId,
  networkCode,
  exceptionTitle,
  exceptionMessage,
  exceptionRequestObject
) => {
  await webhookExceptionsModel.create({
    accountId,
    webhookMasterId,
    networkCode,
    exceptionTitle,
    exceptionMessage,
    exceptionRequestObject,
  });
};

/**
 * Validates the webhook data for webhook log.
 */
exports.validateWebHookReceiveData = asyncWrapper(async (req, res, next) => {
  const splitUrlToGetParams = req.originalUrl.split("/");

  let accountId = splitUrlToGetParams[splitUrlToGetParams.length - 1];
  if (!req.headers.authorization) {
    await createWebhookException(
      accountId,
      null,
      customConstants.statusCodes.UNAUTHORIZED,
      customConstants.messages.MESSAGE_API_KEY_NOT_SENT_FROM_WEBHOOK_HEADERS,
      customConstants.messages.MESSAGE_API_KEY_NOT_SENT_FROM_WEBHOOK_HEADERS,
      {}
    );

    // Return response and stop further execution
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message:
        customConstants.messages.MESSAGE_API_KEY_NOT_SENT_FROM_WEBHOOK_HEADERS,
    });
  }


  let bearerToken = req.headers.authorization.split(" ")[1];
  let token = req.headers.authorization;


  console.log("accountId", accountId);
  console.log("token:===", token);

  if (!["Bearer"].includes(req.headers.authorization.split(" ")[0])) {
    await createWebhookException(
      accountId,
      null,
      customConstants.statusCodes.UNAUTHORIZED,
      customConstants.messages.MESSAGE_INVALID_WEBHOOK_TOKEN,
      customConstants.messages.MESSAGE_INVALID_WEBHOOK_TOKEN,
      {}
    );
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_INVALID_WEBHOOK_TOKEN,
    });
  }
  // If no token is present
  else if (bearerToken === "") {
    await createWebhookException(
      accountId,
      null,
      customConstants.statusCodes.UNAUTHORIZED,
      customConstants.messages.MESSAGE_API_KEY_NOT_SENT_FROM_WEBHOOK_HEADERS,
      customConstants.messages.MESSAGE_API_KEY_NOT_SENT_FROM_WEBHOOK_HEADERS,
      {}
    );

    // Return response and stop further execution
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message:
        customConstants.messages.MESSAGE_API_KEY_NOT_SENT_FROM_WEBHOOK_HEADERS,
    });
  }
  //Encrypt received token to find webhook master
  let encryptReceivedToken = await encryptData({
    authenticationCode: token,
  });
  console.log("encryptReceivedToken:===", encryptReceivedToken);
  const webHookDetails = await webHooksMasterModel
    .findOne({ authenticationCode: encryptReceivedToken })
    .populate("accountId")
    .lean(); /*Test case :- What if a certain Random number is generated twice after long time.
                                                                                                                        Should we need to look for complex generator?           */

  // If webhook details are not found or status is not 'active'
  if (!webHookDetails || webHookDetails.status !== "active") {
    await createWebhookException(
      accountId,
      webHookDetails ? webHookDetails._id : null,
      customConstants.statusCodes.BAD_REQUEST,
      customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND,
      customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND,
      {}
    );

    // Return response and stop further execution
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND,
    });
  }

  if (
    !webHookDetails.accountId ||
    webHookDetails.accountId.status !== "active"
  ) {
    await createWebhookException(
      accountId,
      webHookDetails ? webHookDetails._id : null,
      customConstants.statusCodes.BAD_REQUEST,
      customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
      customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
      {}
    );

    // Return response and stop further execution
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
    });
  }

  let decryptAuthenticatedCode = JSON.parse(
    await decryptData(
      {
        iv: process.env.CRYPTO_IV,
        encryptedData: webHookDetails.authenticationCode,
      },
      process.env.CRYPTO_KEY
    )
  );

  // If token doesn't match
  if (token !== decryptAuthenticatedCode.authenticationCode) {
    await createWebhookException(
      accountId,
      webHookDetails ? webHookDetails._id : null,
      customConstants.statusCodes.UNAUTHORIZED,
      customConstants.messages.MESSAGE_API_KEY_MISMATCH,
      customConstants.messages.MESSAGE_API_KEY_MISMATCH,
      {}
    );

    // Return response and stop further execution
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_API_KEY_MISMATCH,
    });
  }

  let decodeJwt = await jwt.verify(
    decryptAuthenticatedCode.authenticationCode.slice(7),
    process.env.JWT_SECRET
  );
  // If decoded JWT accountId doesn't match
  if (decodeJwt.accountId !== accountId) {
    await createWebhookException(
      accountId,
      webHookDetails ? webHookDetails._id : null,
      customConstants.statusCodes.UNAUTHORIZED,
      customConstants.messages.MESSAGE_JWT_MALFORMED,
      customConstants.messages.MESSAGE_JWT_MALFORMED,
      {}
    );

    // Return response and stop further execution
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_JWT_MALFORMED,
    });
  }

  // If all validations pass, continue to the next middleware
  req.webHookDetails = webHookDetails;
  next();
});

/**
 * Funtion afrer Middleware -> "validateWebHookReceiveData" is passed.
 * Stores reveived data in Table "WebHook logs"
 */

exports.receiveWebhookData = asyncWrapper(async (req, res) => {
  const webHookDetails = req.webHookDetails;

  // Create a new log entry in the database
  await webhookMetaPayloadModel.create({
    accountId: webHookDetails.accountId._id,
    webhookMasterId: webHookDetails._id,
    dataPoint: req.body,
    transactionsCount: req.body?.Transactions.length,
    primaryHookId: req.body?.Metadata?.LocationInformation?.[0]?.[webHookDetails?.primaryHookId]
  });
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_CREATE_WEBHOOK_LOG,
    });
});

// /**
//  * Get the webhook logs reports by filters.
//  */
// exports.getWebHookLogsReports = asyncWrapper(async (req, res) => {
//     const { accountId, integrationsMasterId, webHookId } = req.query;

//     // Retrieve and validate webHook details
//     const webHookDetails = await webHooksModel.findById(webHookId);
//     if (!webHookDetails || webHookDetails.status !== "active") {
//         return res
//             .status(customConstants.statusCodes.BAD_REQUEST)
//             .json({
//                 status: customConstants.messages.MESSAGE_FAIL,
//                 message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND,
//             });
//     }

//     // Retrieve query parameters
//     let statusQuery = req.query.status ? req.query.status.toLowerCase() : null;
//     const providedFromDate = req.query.fromDate ? new Date(req.query.fromDate) : null;
//     const providedToDate = req.query.toDate ? new Date(req.query.toDate) : null;

//     // Set default date range (last 7 days)
//     // const toDate = providedToDate || new Date();
//     // const fromDate = providedFromDate || new Date(new Date().setDate(new Date().getDate() - 6));
//     const toDate = providedToDate ? moment(providedToDate).add(1, 'days').format('YYYY-MM-DDTHH:mm:ss') : moment().add(1, 'days').format('YYYY-MM-DDTHH:mm:ss');
//     const fromDate = providedFromDate ? moment(providedFromDate).format('YYYY-MM-DDTHH:mm:ss') : moment().subtract(6, 'days').format('YYYY-MM-DDTHH:mm:ss');

//     // Validate status values
//     const validStatuses = ['received','initiated','sent','delivered','failed','deleted'];
//     if (statusQuery && !validStatuses.includes(statusQuery)) {
//         statusQuery = null
//     }

//     let webHookLogsReports = [];

//     if (accountId === "null" || integrationsMasterId === "null" || webHookId === "null") {
//         webHookLogsReports = [];
//     } else {
//         webHookLogsReports = await webHooksModel.aggregate([
//             {
//                 $match: {
//                     accountId: new mongoose.Types.ObjectId(accountId),
//                     integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
//                     webHookId: new mongoose.Types.ObjectId(webHookId),
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "webhooklogs",
//                     localField: "_id",
//                     foreignField: "webHookId",
//                     as: "webHookLogsDetails",
//                 },
//             },
//             {
//                 $addFields: {
//                     webHookLogsDetails: {
//                         $filter: {
//                             input: "$webHookLogsDetails",
//                             as: "webHookLogs",
//                             cond: {
//                                 $and: [
//                                     { $gte: ["$$webHookLogs.createdAt", new Date(fromDate)] },
//                                     { $lte: ["$$webHookLogs.createdAt", new Date(toDate)] },
//                                     ...(statusQuery
//                                         ? [{ $eq: ["$$webHookLogs.status", statusQuery] }]
//                                         : []),
//                                 ],
//                             },
//                         },
//                     },
//                 },
//             },
//         ]);
//     }

//     return res
//         .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
//         .json({
//             status: customConstants.messages.MESSAGE_SUCCESS,
//             message: customConstants.messages.MESSAGE_WEBHOOK_LOGS_REPORTS,
//             data: webHookLogsReports
//         });
// });

exports.decryptString = asyncWrapper(async (req, res) => {
  const { encryptedString } = req.body;
  const encrypted = {
    iv: process.env.CRYPTO_IV,
    encryptedData: encryptedString,
  };
  const decryptedResult = JSON.parse(
    await decryptData(encrypted, process.env.CRYPTO_KEY)
  );
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message:
        customConstants.messages.MESSAGE_SERVICE_PROVIDERS_LISTS_DETAILS_FOUND,
      data: {
        decryptedResult,
      },
    });
});

exports.validateWebhookStatus = asyncWrapper(async (req, res, next) => {
  let individualWebhookDetails = await webHooksMasterModel
    .findOne({ _id: req.params.webhookMasterId })
    .populate("accountId", "-password");

  if (
    !individualWebhookDetails.accountId ||
    individualWebhookDetails.accountId.status !== "active"
  ) {
    // Return response and stop further execution
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
    });
  }

  if (
    !individualWebhookDetails ||
    individualWebhookDetails.status !== "active"
  ) {
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND,
    });
  }

  req.individualWebhookDetails = individualWebhookDetails;
  next();
});

exports.getIndividualWebhookDetails = asyncWrapper(async (req, res) => {
  let individualWebhookDetails = req.individualWebhookDetails;

  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GET_INDIVIDUAL_WEBHOOK,

      data: {
        individualWebhookDetails,
      },
    });
});

exports.validateAccountStatus = asyncWrapper(async (req, res, next) => {
  const accountDetails = await accountsModel
    .findById(req.params.accountId)
    .lean();

  if (!accountDetails || accountDetails.status !== "active") {
    // Return response and stop further execution
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
    });
  }

  next();
});

// exports.getAllWebhooksOfAccount = asyncWrapper(async (req, res) => {
//   let getAllWebhooksOfAccount = await webHooksMasterModel
//     .find({ accountId: req.params.accountId })
//     .lean();

//   return res
//     .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
//     .json({
//       status: customConstants.messages.MESSAGE_SUCCESS,
//       message: customConstants.messages.MESSAGE_GET_ALL_WEBHOOK,

//       data: {
//         getAllWebhooksOfAccount,
//       },
//     });
// });


exports.getAllWebhooksOfAccount = asyncWrapper(async (req, res) => {
  const { accountId } = req.params
  // const getAllWebHooks = await webHooksModel.find({accountId,integrationsMasterId}).sort({_id:-1})

  const statusesEnum = ['received', 'in-progress', 'executed', 'execution-failed', 'deleted'];
  const getAllWebHooks = await webHooksModel.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
      }
    },
    {
      $lookup: {
        from: "webhookmetapayloads",
        foreignField: "webhookMasterId",
        localField: "_id",
        as: "webhookLogsDetails"
      }
    },
    {
      $unwind: {
        path: "$webhookLogsDetails",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: {
          webhookMasterId: "$_id",
          status: "$webhookLogsDetails.status"
        },
        count: { $sum: 1 },
        webHookDetails: { $first: "$$ROOT" }
      }
    },
    {
      $group: {
        _id: "$_id.webhookMasterId",
        webHookDetails: { $first: "$webHookDetails" },
        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count"
          }
        }
      }
    },
    {
      $addFields: {
        statuses: {
          $map: {
            input: statusesEnum,
            as: "statusEnum",
            in: {
              status: "$$statusEnum",
              count: {
                $reduce: {
                  input: "$statuses",
                  initialValue: 0,
                  in: {
                    $cond: [
                      { $eq: ["$$this.status", "$$statusEnum"] },
                      { $add: ["$$value", "$$this.count"] },
                      "$$value"
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      $addFields: {
        "webHookDetails.webhookLogsDetails": "$$REMOVE", // Remove the `webhookLogsDetails` field
        "webHookDetails.statuses": "$statuses"
      }
    },
    {
      $replaceRoot: {
        newRoot: "$webHookDetails"
      }
    }
    /*
    {
        $project: {
            // webHookDetails: {
            //     _id: 1,
            //     webHookId: "$webHookDetails._id",
            //     accountId: "$webHookDetails.accountId",
            //     integrationsMasterId: "$webHookDetails.integrationsMasterId",
            //     webHookName: "$webHookDetails.webHookName",
            //     webHookUrl: "$webHookDetails.webHookUrl",
            //     authenticationCode: "$webHookDetails.authenticationCode",
            //     status: "$webHookDetails.status",
            //     createdAt: "$webHookDetails.createdAt",
            //     updatedAt: "$webHookDetails.updatedAt",
            //     requestObject: "$webHookDetails.requestObject"
            // },
            webHookDetails: 1,
            // statuses: 1,
            _id: 0
        }
    }
        */
  ]);

  const getWebHookLogs = await webHooksModel.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
      }
    },
    {
      $lookup: {
        from: "webhookmetapayloads",
        foreignField: "webhookMasterId",
        localField: "_id",
        as: "webhookLogsDetails"
      }
    }
  ]);
  const getPast6WeeksStatuses = await getWebHooksLogsSixWeekSalesData(getWebHookLogs)

  const getOverallStatuses = await webHooksModel.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
      }
    },
    {
      $lookup: {
        from: "webhookmetapayloads",
        foreignField: "webhookMasterId",
        localField: "_id",
        as: "webhookLogsDetails"
      }
    },
    {
      $unwind: {
        path: "$webhookLogsDetails",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: "$webhookLogsDetails.status",
        count: { $sum: 1 }
      }
    },
    {
      $addFields: {
        status: "$_id",
        count: "$count",
        _id: 0
      }
    },
    {
      $group: {
        _id: null,
        statuses: { $push: { status: "$status", count: "$count" } }
      }
    },
    {
      $project: {
        _id: 0,
        mergedStatuses: {
          /*
          $map: {
              input: statusesEnum,
              as: "status",
              in: {
                  status: "$$status",
                  count: {
                      $ifNull: [
                          {
                              $arrayElemAt: [
                                  {
                                      $filter: {
                                          input: "$statuses",
                                          as: "item",
                                          cond: [ {$eq: ["$$item.status", "$$status"]},
                                          { $add: ["$$value", "$$this.count"] },
                                          "$$value"
                                       ]
                                      }
                                  },
                                  0
                              ]
                          },
                          { count: 0 }
                      ]
                  }
              }
          }
              */
          $map: {
            input: statusesEnum,
            as: "statusEnum",
            in: {
              status: "$$statusEnum",
              count: {
                $reduce: {
                  input: "$statuses",
                  initialValue: 0,
                  in: {
                    $cond: [
                      { $eq: ["$$this.status", "$$statusEnum"] },
                      { $add: ["$$value", "$$this.count"] },
                      "$$value"
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      $project: {
        statuses: "$mergedStatuses"
      }
    }
  ]);

  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GET_ALL_WEBHOOK,
      data: {
        webHooks: getAllWebHooks,
        pastSixWeeksData: getPast6WeeksStatuses,
        overallStatusesCount: getOverallStatuses[0]?.statuses || []
      }
    });
})



exports.validateWebhookandAccount = asyncWrapper(async (req, res, next) => {
  const { webhookMasterId } = req.params;

  const webhookDetails = await webHooksMasterModel.findById(webhookMasterId).populate('accountId').lean();
  if (!webhookDetails && webhookDetails?.status !== 'active') {
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_WEBOOK_ALREADY_DELETED,
    });
  }
  if (!webhookDetails?.accountId && webhookDetails?.accountId?.status !== 'active') {
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
    });
  }
  else
    next()
});

exports.updateWebhookSettings = asyncWrapper(async (req, res) => {
  const { webhookMasterId } = req.params;

  await webHooksMasterModel.findByIdAndUpdate(webhookMasterId, {
    $set: Object.fromEntries(
      Object.entries(req.body).map(([key, value]) => [`webhookSettings.${key}`, value])
    )
  }, { new: true, upsert: true });
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_SETTINGS_UPDATED
  })
})


exports.getAllWebhookTransactionsOfAccount = asyncWrapper(async (req, res) => {
  const { accountId, serialNumbers, transactionTypes, fromDate, toDate } = req.query;

  console.log('fromDate, toDate:', fromDate, toDate);
  console.log('serialNumbers:', serialNumbers);

  if (!fromDate || !toDate) {
    throw new Error('accountId, fromDate, and toDate are required');
  }

  if (!moment(fromDate).isValid() || !moment(toDate).isValid()) {
    throw new Error('Invalid date format for fromDate or toDate');
  }

  let serialNumbersArray = [];
  if (serialNumbers && serialNumbers !== 'all') {
    serialNumbersArray = serialNumbers.includes(',')
      ? serialNumbers.split(',').map((s) => s.trim())
      : [serialNumbers];
  }
  console.log('serialNumbersArray:', serialNumbersArray);

  let transactionTypesArray = [];
  if (transactionTypes && transactionTypes !== 'all') {
    transactionTypesArray = transactionTypes.includes(',')
      ? transactionTypes.split(',').map((t) => t.trim())
      : [transactionTypes];
  }
  console.log('transactionTypesArray:', transactionTypesArray);
  let matchConditions = {
    transactionDateTime: {
      $gte: moment(fromDate).toDate(),
      $lte: moment(toDate).toDate(),
    },
  };

  if (req.user.accountId.accountType === "merchant") {
    matchConditions.serialNumber = { $in: req.user.accountId.machines }
  }
  else {
    matchConditions.accountId = new mongoose.Types.ObjectId(accountId)
    matchConditions.serialNumber = { $in: req.user.accountId.machines }
  }

  if (serialNumbersArray.length > 0) {
    matchConditions.serialNumber = { $in: serialNumbersArray };
  }

  if (transactionTypesArray.length > 0) {
    matchConditions.transactionType = { $in: transactionTypesArray };
  }

  console.log('matchConditions:', matchConditions);

  const pipeline = [];

  pipeline.push({
    $addFields: {
      transactionDateTime: { $toDate: '$transactionDateTime' },
    },
  });

  pipeline.push({
    $match: matchConditions,
  });

  pipeline.push({
    $sort: { transactionDateTime: -1 },
  });

  pipeline.push({
    $project: {
      webhookMasterId: 0,
      webhookMetaPayloadId: 0,
      accountId: 0,
      webhookTransactionId: 0,
    },
  });

  const webhookTransactionDetails = await webhookPayloadTransactions.aggregate(pipeline);

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_TRANSACTIONS,
    data: {
      webhookTransactionDetails,
    },
  });
});

exports.merchantSmartFilteredDashboard = asyncWrapper(async (req, res, next) => {
  let { accountId } = req.params
  let { selectDashboard, merchantNames } = req.query

  let returnDashboardFiltersSafeCash;
  let returnDashboardFiltersCardConnect;
  let cashAndCardMixResultArray = []
  let selectDashboardArray = selectDashboard.split(',')
  let merchantNamesArray = merchantNames.split(',')
  console.log("selectDashboardArray===", selectDashboardArray)
  console.log("merchantNamesArray===", merchantNamesArray)

  let { fromDate, toDate } = req.query  //From date and to date are constant 
  let { serialNumbers, cashTransactionTypes, } = req.query   //Filters of cima-machine
  let { cardTransactionTypes, cardTransactionStatus, customerDetails, batchNumber, } = req.query    // Filters of Card-connect

  if (selectDashboardArray.includes('cima-machine')) {
    returnDashboardFiltersSafeCash = await dashboardFiltersSafeCash(fromDate, toDate, merchantNamesArray, selectDashboardArray, serialNumbers, cashTransactionTypes, accountId)
  }

  if (selectDashboardArray.includes('card-connect')) {

    returnDashboardFiltersCardConnect = await dashboardFiltersCardConnect(cardTransactionTypes, cardTransactionStatus, customerDetails, batchNumber, fromDate, toDate, accountId, merchantNamesArray, selectDashboardArray)

  }



  // ✅ Merge & sort results if both exist
  if (
    Array.isArray(returnDashboardFiltersSafeCash) ||
    Array.isArray(returnDashboardFiltersCardConnect)
  ) {
    cashAndCardMixResultArray = [
      ...(returnDashboardFiltersSafeCash || []),
      ...(returnDashboardFiltersCardConnect || []),
    ];

    // Sort by transactionDate (descending)
    cashAndCardMixResultArray.sort(
      (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)
    );
  }

  console.log("cashAndCardMixResultArray===", cashAndCardMixResultArray.length)



  //--------------------------------------------------------------------------------------------------------------------------------
  let machineSummaryDetails = {
    totalTransactionsCount: returnDashboardFiltersSafeCash ? returnDashboardFiltersSafeCash.length : 0,
    totalMachinesCount: 0,
    totalTransactionTypesCount: 0,
    successfulTransactionsCount: returnDashboardFiltersSafeCash ? returnDashboardFiltersSafeCash.length : 0,
    failureTransactionsCount: 0,
    totalAmount: 0,
    totalMerchantsSelected: merchantNamesArray.length
  }




  //--------------------------------------------------------------------------------------------------------------------------------
  let cardConnectSummaryDetails = {
    totalTransactionsCount: returnDashboardFiltersCardConnect ? returnDashboardFiltersCardConnect.length : 0,
    successfulTransactionsCount: 0,
    failureTransactionsCount: 0,
    totalAmount: 0,
    totalUsers: 0,
    totalRefundedTransactionsCount: 0,
    totalRefundedAmount: 0,
    totalBatches: 0,
    totalMerchantsSelected: merchantNamesArray.length
  }
  let getSummaryDetailsQueryFunction = await getSummaryDetails(returnDashboardFiltersSafeCash, returnDashboardFiltersCardConnect, machineSummaryDetails, cardConnectSummaryDetails)



  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_CASH_OR_AND_CARD_TRANSACTIONS_RETREIVED,
    data: {

      cimaMachineTransactionsCount: returnDashboardFiltersSafeCash ? returnDashboardFiltersSafeCash.length : 0,
      cardConnectTransactionsCount: returnDashboardFiltersCardConnect ? returnDashboardFiltersCardConnect.length : 0,


      cashAndCardMixResultArray,
      getSummaryDetailsQueryFunction
    },
  });



})





exports.getAllWebhookPayoadHeadersOfAccount = asyncWrapper(async (req, res) => {
  const { accountId } = req.params
  let matchCondition = {}
  if (req.user.accountId.accountType === "merchant") {
    matchCondition = {
      serialNumber: { $in: req.user.accountId.machines }
    }
  }
  else {
    matchCondition = {
      accountId: new mongoose.Types.ObjectId(accountId)
    }
  }

  let accountDetails = await accountsModel.findOne({ accountId })
  let allMerchants = [];
  let merchantNames = {
    merchantName: accountDetails?.accountName,
    objectId: accountDetails?._id
  }
  allMerchants.push(merchantNames)
  let categories = ["cima-machine", "card-connect"]



  const webhookPayloadHeadersData = await webhookPayloadHeaders.aggregate([
    {
      $match: {
        ...matchCondition
      }
    },
    {
      $addFields: {
        userName: {
          $cond: {
            if: { $eq: ["$userName", ""] },  // check if empty string
            then: "unknown",                  // replace with "unknown"
            else: "$userName"
          }
        }
      }
    },
    {
      $facet: {
        serialNumbers: [
          { $group: { _id: null, serialNumbers: { $addToSet: "$serialNumber" } } },
          { $project: { _id: 0, serialNumbers: 1 } }
        ],
        transactionTypes: [
          { $group: { _id: null, transactionTypes: { $addToSet: "$transactionType" } } },
          { $project: { _id: 0, transactionTypes: 1 } }
        ],
        userNamesOfMachine: [
          {
            $group: {
              _id: "$serialNumber",
              userNames: { $addToSet: "$userName" }
            }
          },
          {
            $project: {
              _id: 0,
              serialNumber: "$_id",
              userNames: 1
            }
          }
        ]
      }
    },
    {
      $project: {
        serialNumbers: { $arrayElemAt: ["$serialNumbers.serialNumbers", 0] },
        transactionTypes: { $arrayElemAt: ["$transactionTypes.transactionTypes", 0] },
        userNamesOfMachine: 1
      }
    }
  ]);

  let findIntegrationWithCardConnectCredentials = await cardConnectIntegrationsCredentialsModel.findOne({ accountId: new mongoose.Types.ObjectId(accountId) })
  let findIntegrationWithCardConnectSettings = await cardConnectIntegrationsSettingsModel.findOne({ accountId: new mongoose.Types.ObjectId(accountId) })

  let merchantPayloadHeaders

  if (findIntegrationWithCardConnectCredentials && findIntegrationWithCardConnectSettings) {
    merchantPayloadHeaders = await getMerchantCardConnectPayloadHeaders(accountId)
  } else {

    merchantPayloadHeaders = {}
  }




  const listOfWebhooks = await webHooksMasterModel.find({ accountId: accountId })
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBHOOK_PAYLOAD_HEADERS,
    data: {
      categories,
      merchantNames: allMerchants,
      webhookPayloadHeadersData: webhookPayloadHeadersData[0] ? webhookPayloadHeadersData[0] : {},
      merchantPayloadHeaders: merchantPayloadHeaders
      // listOfWebhooks: listOfWebhooks
    }
  })
})



exports.getDashboardStatisticsOfAccount = asyncWrapper(async (req, res) => {
  const { accountId } = req.params
  let matchCondition = {}
  console.log('req.user.accountId.accountType:===', req.user.accountId.accountType)
  if (req.user.accountId.accountType === "merchant") {
    matchCondition = {
      serialNumber: { $in: req.user.accountId.machines }
    }
  }
  else {
    matchCondition = {
      accountId: new mongoose.Types.ObjectId(accountId)
    }
  }
  console.log('matchCondition:===', matchCondition)
  // console.log('matchCondition:===',...matchCondition)
  let getLastSiWeeksResult = getSixWeeksSalesFunction()

  const fromDate = getLastSiWeeksResult[0].fromDate;
  const toDate = getLastSiWeeksResult[getLastSiWeeksResult.length - 1].toDate;

  const aggregationPipeline = [
    {
      $match: {
        // accountId: new mongoose.Types.ObjectId(accountId),
        ...matchCondition,
        transactionDateTime: {
          $gte: fromDate,
          $lte: toDate
        }
      }
    },
    {
      $addFields: {
        hasDenominations: {
          // $gt: [{ $size: { $ifNull: ["$denominations", []] } }, 0]
          $gt: ["$amount", 0]
        }
      }
    },
    {
      $project: {
        transactionDateTime: 1,
        amount: 1,
        serialNumber: 1,
        userName: 1,
        hasDenominations: 1
      }
    },
    {
      $addFields: {
        matchedWeek: {
          $arrayElemAt: [
            {
              $filter: {
                input: getLastSiWeeksResult,
                as: "week",
                cond: {
                  $and: [
                    { $gte: ["$transactionDateTime", "$$week.fromDate"] },
                    { $lte: ["$transactionDateTime", "$$week.toDate"] }
                  ]
                }
              }
            },
            0
          ]
        }
      }
    },
    {
      $group: {
        _id: {
          fromDate: "$matchedWeek.fromDate",
          toDate: "$matchedWeek.toDate"
        },
        totalAmount: { $sum: "$amount" },
        transactionsCount: {
          $sum: {
            $cond: ["$hasDenominations", 1, 0]
          }
        },
        machines: { $addToSet: "$serialNumber" }
      }
    },
    {
      $project: {
        _id: 0,
        fromDate: "$_id.fromDate",
        toDate: "$_id.toDate",
        totalAmount: 1,
        transactionsCount: 1,
        machinesCount: { $size: "$machines" }
      }
    }
  ];

  const sixWeekAggregate = await webhookPayloadTransactions.aggregate(aggregationPipeline)

  const sixWeekAggregateFinalResult = getLastSiWeeksResult.map(week => {
    const matchingWeek = sixWeekAggregate.find(r =>
      String(r.fromDate) === String(week.fromDate) &&
      String(r.toDate) === String(week.toDate)
    );

    return matchingWeek || {
      fromDate: week.fromDate,
      toDate: week.toDate,
      machinesCount: 0,
      totalAmount: 0,
      transactionsCount: 0
    };
  });

  const predefinedStatuses = ["received", "in-progress", "executed", "execution-failed"];
  let metaPayloadMatchCondition = {}
  if (Object.keys(matchCondition).includes("serialNumber")) {
    metaPayloadMatchCondition["primaryHookId"] = matchCondition.serialNumber
  } else {
    metaPayloadMatchCondition = matchCondition
  }
  console.log('metaPayloadMatchCondition:====', metaPayloadMatchCondition)

  let payloadSummary = []
  let metaPayloadQuery = await webhookMetaPayloadModel.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
          $lte: new Date(),
        },
      }
    },
    {
      $facet: {
        statusCounts: [
          {
            $match: {
              ...metaPayloadMatchCondition,
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              status: "$_id",
              count: 1,
              _id: 0,
            },
          },
          {
            $group: {
              _id: null,
              statusCountsData: { $push: "$$ROOT" },
            },
          },
          {
            $project: {
              statusCounts: {
                $map: {
                  input: ["received", "in-progress", "executed", "execution-failed"],
                  as: "status",
                  in: {
                    status: "$$status",
                    count: {
                      $ifNull: [
                        {
                          $getField: {
                            field: "count",
                            input: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$statusCountsData",
                                    as: "s",
                                    cond: { $eq: ["$$s.status", "$$status"] },
                                  },
                                },
                                0,
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                },
              },
              _id: 0,
            },
          },
        ],
        payloadsCount: [
          {
            $match: {
              $expr: { $in: ["$primaryHookId", matchCondition.serialNumber?.$in || []] },
            },
          },
          {
            $count: "payloadsCount",
          },
          {
            $project: {
              payloadsCount: "$payloadsCount",
              _id: 0,
            },
          },
        ],
        serialNumbers: [
          {
            $match: {
              ...metaPayloadMatchCondition,
            },
          },
          {
            $group: {
              _id: null,
              serialNumbers: { $addToSet: "$primaryHookId" },
            },
          },
          {
            $project: {
              serialNumbersCount: { $size: { $ifNull: ["$serialNumbers", []] } },
              _id: 0,
            },
          },
        ],
      },
    },
    {
      $project: {
        statusCounts: { $arrayElemAt: ["$statusCounts.statusCounts", 0] },
        payloadsCount: { $arrayElemAt: ["$payloadsCount.payloadsCount", 0] },
        serialNumbersCount: { $arrayElemAt: ["$serialNumbers.serialNumbersCount", 0] },
        _id: 0,
      },
    },
  ]);

  let transactionsQuery = await webhookPayloadTransactions.aggregate([
    {
      $match: {
        ...matchCondition,
        createdAt: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
          $lte: new Date(),
        },
        userName: { $exists: true, $ne: null, $ne: "" },
        location: { $exists: true, $ne: null, $ne: "" },
      },
    },
    {
      $group: {
        _id: "$_id",
        userName: { $first: "$userName" },
        location: { $first: "$location" },
        transactionType: { $first: "$transactionType" },
        amount: { $first: "$amount" },
      },
    },
    {
      $group: {
        _id: null,
        transactionTypes: { $addToSet: "$transactionType" },
        users: { $addToSet: "$userName" },
        locations: { $addToSet: "$location" },
        transactionIds: {
          $addToSet: {
            $cond: {
              if: { $gt: ["$amount", 0] },
              then: "$_id",
              else: "$$REMOVE",
            },
          },
        },
      },
    },
    {
      $project: {
        transactionTypesCount: { $size: { $ifNull: ["$transactionTypes", []] } },
        usersCount: { $size: { $ifNull: ["$users", []] } },
        locationsCount: { $size: { $ifNull: ["$locations", []] } },
        transactionsCount: { $size: { $ifNull: ["$transactionIds", []] } },
        _id: 0,
      },
    },
  ]);

  payloadSummary = [{ ...metaPayloadQuery[0], ...transactionsQuery[0] }]


  const exceptionsCount = await webhookExceptionsModel.find(
    // { accountId: accountId }
    matchCondition
  ).countDocuments()

  const totalAccountSummary = await webhookPayloadTransactions.aggregate([
    {
      $match: {
        ...matchCondition,
        userName: { $ne: "", $exists: true },
        amount: { $exists: true, $ne: null } // Ensure amount exists
      }
    },
    {
      $group: {
        _id: null,
        transactionCount: {
          $sum: {
            $cond: { if: { $gt: ["$amount", 0] }, then: 1, else: 0 }
          }
        },
        serialNumbers: { $addToSet: "$serialNumber" },
        users: { $addToSet: "$userName" },
        transactionIds: {
          $addToSet: {
            $cond: { if: { $gt: ["$amount", 0] }, then: "$_id", else: "$$REMOVE" }
          }
        },
        transactions: {
          $push: {
            $cond: { if: { $gt: ["$amount", 0] }, then: "$$ROOT", else: "$$REMOVE" }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        transactionCount: 1,
        serialNumbersCount: { $size: { $ifNull: ["$serialNumbers", []] } },
        usersCount: { $size: { $ifNull: ["$users", []] } },
        transactionIdsCount: { $size: { $ifNull: ["$transactionIds", []] } },
        totalRevenue: {
          $reduce: {
            input: "$transactions",
            initialValue: 0,
            in: { $add: ["$$value", "$$this.amount"] }
          }
        },
        exceptionsCount: { $literal: exceptionsCount }
      }
    }
  ]);

  const topFiveDeviceDetails = await webhookPayloadTransactions.aggregate([
    {
      $addFields: {
        transactionDateTime: { $toDate: '$transactionDateTime' }
      }
    },
    {
      $match: {
        ...matchCondition,
        amount: { $exists: true, $ne: null, $gt: 0 },
        transactionDateTime: {
          $gte: moment().utc().subtract(1, 'day').startOf('day').toDate(),
          $lte: moment().utc().endOf('day').toDate()
        }
      }
    },
    {
      $group: {
        _id: "$serialNumber",
        location: { $first: "$location" },
        totalTransactionCount: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        transactions: { $push: "$$ROOT" }
      }
    },
    {
      $sort: { totalAmount: -1 }
    },
    {
      $limit: 5
    },
    {
      $project: {
        _id: 0,
        serialNumber: "$_id",
        totalAmount: 1,
        location: 1,
        totalTransactionCount: 1,
      }
    }
  ]);

  const denominations = await webhookPayloadTransactions.aggregate([
    {
      $match: {
        // accountId: new mongoose.Types.ObjectId(accountId),
        ...matchCondition,
        createdAt: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
          $lte: new Date()
        }
      },
    },
    {
      $unwind: {
        path: "$denominations",
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $match: {
        "denominations.UnitValue": { $ne: null },
        "denominations.Count": { $ne: null },
        "denominations.Currency": { $ne: null }
      }
    },
    {
      $group: {
        _id: {
          serialNumber: "$serialNumber",
          transactionType: "$transactionType",
          unitValue: "$denominations.UnitValue",
          currency: "$denominations.Currency"
        },
        totalCount: {
          $sum: { $ifNull: ["$denominations.Count", 0] }
        },
        totalAmount: {
          $sum: {
            $multiply: [
              "$denominations.UnitValue",
              "$denominations.Count"
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: {
          serialNumber: "$_id.serialNumber",
          transactionType: "$_id.transactionType"
        },
        denominations: {
          $push: {
            UnitValue: "$_id.unitValue",
            Count: "$totalCount",
            Currency: "$_id.currency"
          }
        },
        totalAmount: { $sum: "$totalAmount" }
      }
    },
    {
      $project: {
        _id: 0,
        serialNumber: "$_id.serialNumber",
        transactionType: "$_id.transactionType",
        denominations: {
          $cond: {
            if: { $gt: [{ $size: "$denominations" }, 0] },
            then: "$denominations",
            else: []
          }
        },
        totalAmount: 1
      }
    }
  ]);

  const latestTransactions = await webhookPayloadTransactions.aggregate([
    {
      $match: {
        // accountId: new mongoose.Types.ObjectId(accountId),
        ...matchCondition,
        amount: { $ne: 0 }
      }
    },
    {
      $sort: {
        transactionDateTime: -1
      }
    },
    {
      $limit: 10
    },
    {
      $project: {
        serialNumber: 1,
        transactionDateTime: 1,
        userName: 1,
        amount: 1,
        location: 1
      }
    },
  ])

  const topFiveUsersDetails = await webhookPayloadTransactions.aggregate([
    {
      $addFields: {
        transactionDateTime: { $toDate: '$transactionDateTime' }
      }
    },
    {
      $match: {
        ...matchCondition,
        userName: { $ne: "", $exists: true },
        amount: { $exists: true, $ne: null, $gt: 0 },
        transactionDateTime: {
          $gte: moment().utc().subtract(1, 'day').startOf('day').toDate(),
          $lte: moment().utc().endOf('day').toDate()
        }
      }
    },
    {
      $group: {
        _id: "$userName",
        location: { $first: "$location" },
        totalTransactionCount: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        transactions: { $push: "$$ROOT" }
      }
    },
    {
      $sort: { totalAmount: -1 }
    },
    {
      $limit: 6
    },
    {
      $project: {
        _id: 0,
        userName: "$_id",
        totalAmount: 1,
        location: 1,
        totalTransactionCount: 1,
      }
    }
  ]);


  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_DASHBOARD_STATISTICS,
    data: {
      lastSixWeeksDataForGraph: sixWeekAggregateFinalResult,
      payloadSummary,
      totalAccountSummary,
      topFiveDeviceDetails,
      denominations,
      latestTransactions,
      topFiveUsersDetails
    }
  })
})


exports.getListOfMachines = asyncWrapper(async (req, res) => {
  const { accountId, webhookMasterId } = req.query
  let matchCondition = {}
  if (req.user.accountId.accountType === "merchant") {
    matchCondition = {
      serialNumber: { $in: req.user.accountId.machines }
    }
  }
  else {
    matchCondition = {
      accountId: new mongoose.Types.ObjectId(accountId)
    }
  }

  // const listOfMachines = await webhookPayloadHeaders.find({ accountId: accountId }).sort({ _id: -1 })
  const listOfMachines = await webhookPayloadHeaders.find(matchCondition).sort({ _id: -1 })

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_DASHBOARD_STATASTICS,
    data: listOfMachines
  })
})


exports.getAllMachineReports = asyncWrapper(async (req, res) => {
  const { accountId } = req.query
  let matchCondition = {}
  if (req.user.accountId.accountType === "merchant") {
    matchCondition = {
      serialNumber: { $in: req.user.accountId.machines }
    }
  }
  else {
    matchCondition = {
      accountId: new mongoose.Types.ObjectId(accountId)
    }
  }
  const predefinedStatuses = ["received", "in-progress", "executed", "execution-failed"];

  const machineDetails = await webhookPayloadHeaders.aggregate([
    {
      $match: {
        // accountId: new mongoose.Types.ObjectId(accountId),
        ...matchCondition
      },
    },
    {
      $group: {
        _id: {
          serialNumber: "$serialNumber",
          location: "$location",
        },
        accountId: { $first: "$accountId" },
      },
    },
    {
      $lookup: {
        from: "webhookmetapayloads",
        let: { sn: "$_id.serialNumber", location: "$_id.location" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $isArray: "$dataPoint.Metadata.LocationInformation" },
                  {
                    $anyElementTrue: {
                      $map: {
                        input: "$dataPoint.Metadata.LocationInformation",
                        as: "loc",
                        in: {
                          $and: [
                            { $eq: ["$$loc.SerialNumber", "$$sn"] },
                            { $eq: ["$$loc.Location", "$$location"] },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
        as: "metapayloads",
      },
    },
    {
      $addFields: {
        statusCount: {
          $arrayToObject: {
            $map: {
              input: predefinedStatuses,
              as: "status",
              in: {
                k: "$$status",
                v: {
                  $size: {
                    $filter: {
                      input: "$metapayloads",
                      as: "meta",
                      cond: { $eq: ["$$meta.status", "$$status"] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: "webhookpayloadtransactions",
        foreignField: "serialNumber",
        localField: "_id.serialNumber",
        as: "webhooktransactionsresults",
      },
    },
    {
      $unwind: {
        path: "$webhooktransactionsresults",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        "webhooktransactionsresults.amount": { $exists: true, $ne: 0 },
      },
    },
    {
      $group: {
        _id: {
          serialNumber: "$_id.serialNumber",
          location: "$_id.location",
        },
        statusCount: { $first: "$statusCount" },
        metapayloads: { $first: "$metapayloads" },
        transactionIds: { $addToSet: "$webhooktransactionsresults._id" },
        totalAmount: {
          $sum: "$webhooktransactionsresults.amount"
        }
      },
    },
    {
      $project: {
        _id: 0,
        serialNumber: "$_id.serialNumber",
        location: "$_id.location",
        statusCount: 1,
        metapayloads: 1,
        transactionsCount: { $size: { $ifNull: ["$transactionIds", []] } },
        totalAmount: 1
      },
    },
  ]);



  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_MACHINE_REPORTS,
    data: machineDetails
  })

})

exports.getPayloadReports = asyncWrapper(async (req, res) => {
  const { serialNumber, accountId, webhookMasterId } = req.query
  let matchCondition = {}
  if (req.user.accountId.accountType === "merchant") {
    matchCondition = {
      serialNumber: serialNumber
    }
  }
  else {
    matchCondition = {
      accountId: new mongoose.Types.ObjectId(accountId),
      serialNumber: serialNumber
    }
  }
  console.log('matchCondition:===', matchCondition)
  let getLastSiWeeksResult = getSixWeeksSalesFunction()

  // const fromDate = getLastSiWeeksResult[0].fromDate;
  // const toDate = getLastSiWeeksResult[getLastSiWeeksResult.length - 1].toDate;

  const fromDate = getLastSiWeeksResult[0].fromDate;
  const toDate = getLastSiWeeksResult[getLastSiWeeksResult.length - 1].toDate;
  console.log('fromDate:===', fromDate)
  console.log('toDate:===', toDate)
  const lastSixWeeksDataForGraph = await webhookPayloadTransactions.aggregate([
    {
      $match: {
        // accountId: new mongoose.Types.ObjectId(accountId),
        ...matchCondition,
        transactionDateTime: {
          $gte: fromDate,
          $lte: toDate
        }
      }
    },
    {
      $project: {
        amount: 1,
        transactionDateTime: 1,
        createdAt: 1,
        updatedAt: 1,
        userName: 1,
        serialNumber: 1,
        transactionType: 1,
        denominations: 1
      }
    },
    // First: Assign the matchedWeek
    {
      $addFields: {
        matchedWeek: {
          $arrayElemAt: [
            {
              $filter: {
                input: getLastSiWeeksResult,
                as: "week",
                cond: {
                  $and: [
                    { $gte: ["$transactionDateTime", "$$week.fromDate"] },
                    { $lte: ["$transactionDateTime", "$$week.toDate"] }
                  ]
                }
              }
            },
            0
          ]
        }
      }
    },
    // Second: Assign the hasDenominations flag
    {
      $addFields: {
        hasAmount: {
          $gt: ["$amount", 0]
        }
      }
    },
    {
      $group: {
        _id: {
          fromDate: "$matchedWeek.fromDate",
          toDate: "$matchedWeek.toDate"
        },
        totalAmount: { $sum: "$amount" },
        transactionsCount: {
          $sum: 1
        },
        users: {
          $addToSet: {
            $cond: [
              {
                $not: {
                  $in: ["$userName", ["", null]]
                }
              },
              "$userName",
              "$$REMOVE"
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        fromDate: "$_id.fromDate",
        toDate: "$_id.toDate",
        totalAmount: 1,
        transactionsCount: 1,
        totalUsers: { $size: "$users" }
      }
    }
  ]);


  const sixWeekAggregateFinalResult = getLastSiWeeksResult.map(week => {
    const matchingWeek = lastSixWeeksDataForGraph.find(r =>
      String(r.fromDate) === String(week.fromDate) &&
      String(r.toDate) === String(week.toDate)
    );

    return matchingWeek || {
      fromDate: week.fromDate,
      toDate: week.toDate,
      totalUsers: 0,
      totalAmount: 0,
      transactionsCount: 0
    };
  });


  const totalSummaryOfMachine = await webhookPayloadTransactions.aggregate([
    {
      $addFields: {
        transactionDateTime: { $toDate: '$transactionDateTime' }
      }
    },
    {
      $match: {
        // accountId: new mongoose.Types.ObjectId(accountId),
        ...matchCondition,
        // serialNumber,
        // createdAt: {
        //   $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        //   $lte: new Date()
        // }
        transactionDateTime: {
          $gte: moment().utc().subtract(6, 'months').startOf('day').toDate(),
          $lte: moment().utc().endOf('day').toDate()
        }
      }
    },
    {
      $addFields: {
        hasAmount: {
          $gt: ["$amount", 0]
        }
      }
    },
    {
      $group: {
        _id: {
          serialNumber: "$serialNumber",
          transactionType: "$transactionType",
          userName: "$userName",
          transactionId: "$_id"
        },
        totalAmount: {
          $sum: "$amount"
        },
        hasAmount: { $first: "$hasAmount" }
      }
    },
    {
      $group: {
        _id: null,
        serialNumbers: { $addToSet: "$_id.serialNumber" },
        transactionTypes: { $addToSet: "$_id.transactionType" },
        users: {
          $addToSet: {
            $cond: [
              {
                $not: {
                  $in: ["$_id.userName", ["", null]]
                }
              },
              "$_id.userName",
              "$$REMOVE"
            ]
          }
        },
        totalAmount: { $sum: "$totalAmount" },
        transactionsCount: {
          $sum: { $cond: ["$hasAmount", 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        serialNumbersCount: { $size: "$serialNumbers" },
        transactionTypesCount: { $size: "$transactionTypes" },
        usersCount: { $size: "$users" },
        totalAmount: 1,
        transactionsCount: 1
      }
    }
  ]);

  const machineTransactions = await webhookPayloadTransactions.find({
    // serialNumber: serialNumber, 
    // accountId: new mongoose.Types.ObjectId(accountId)
    ...matchCondition
  })

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setUTCDate(today.getUTCDate() - 6);

  const endDate = new Date(today);
  endDate.setUTCDate(today.getUTCDate() + 1);

  const aggResult = await webhookPayloadTransactions.aggregate([
    {
      $addFields: {
        transactionDateTime: { $toDate: '$transactionDateTime' }
      }
    },
    {
      $match: {
        // accountId: new mongoose.Types.ObjectId(accountId),
        ...matchCondition,
        // serialNumber: serialNumber,
        // createdAt: {
        //   $gte: startDate,
        //   $lt: endDate
        // },
        transactionDateTime: {
          $gte: moment(startDate).utc().startOf('day').toDate(),
          $lte: moment(endDate).utc().endOf('day').toDate()
        }
      }
    },
    {
      $addFields: {
        hasAmount: {
          $gt: ["$amount", 0] // Flag for amount > 0
        }
      }
    },
    {
      $addFields: {
        dateOnly: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" }
        }
      }
    },
    {
      $group: {
        _id: {
          transactionId: "$_id",
          dateOnly: "$dateOnly"
        },
        userName: { $first: "$userName" },
        denominationTotal: { $sum: "$amount" },
        hasAmount: { $first: "$hasAmount" }
      }
    },
    {
      $group: {
        _id: "$_id.dateOnly",
        users: {
          $addToSet: {
            $cond: [
              { $not: { $in: ["$userName", ["", null]] } },
              "$userName",
              "$$REMOVE"
            ]
          }
        },
        totalTransactions: {
          $sum: { $cond: ["$hasAmount", 1, 0] }
        },
        totalAmount: {
          $sum: { $cond: ["$hasAmount", "$denominationTotal", 0] }
        },
        transactionsCount: {
          $sum: { $cond: ["$hasAmount", 1, 0] }
        }
      }
    },
    {
      $addFields: {
        totalUsers: { $size: "$users" },
        date: "$_id"
      }
    },
    {
      $project: {
        _id: 0,
        date: 1,
        totalUsers: 1,
        totalTransactions: 1,
        transactionsCount: 1,
        totalAmount: 1
      }
    }
  ]);

  const resultMap = {};
  aggResult.forEach((entry) => {
    resultMap[entry.date] = entry;
  });

  const userActivityResult = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    userActivityResult.push(
      resultMap[dateStr] || {
        date: dateStr,
        totalUsers: 0,
        totalTransactions: 0,
        transactionsCount: 0,
        totalAmount: 0
      }
    );
  }
  userActivityResult.sort((a, b) => new Date(b.date) - new Date(a.date));

  //Progress- meter code
  // Get the current time
  const now = new Date();

  // Calculate time ranges
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const twelveMonthsAgo = new Date(sixMonthsAgo);
  twelveMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // First aggregation (last 6 months)
  const lastSixMonths = await webhookPayloadTransactions.aggregate([
    {
      // Convert the string to a proper date in a new field
      $addFields: {
        transactionDateTime: {
          $toDate: "$transactionDateTime"
        }
      }
    },
    {
      $match: {
        transactionDateTime: { $gte: sixMonthsAgo },
        // accountId: new mongoose.Types.ObjectId(accountId),
        ...matchCondition,
        // serialNumber: serialNumber
      }
    },
    {
      $group: {
        _id: "$transactionType",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        transactionType: "$_id",
        totalAmount: 1,
        count: 1
      }
    }
  ]);

  // Second aggregation (previous 6 months)
  const previousSixMonths = await webhookPayloadTransactions.aggregate([
    {
      // Convert the string to a proper date in a new field
      $addFields: {
        transactionDateTime: {
          $toDate: "$transactionDateTime"
        }
      }
    },


    {
      $match: {
        transactionDateTime: { $gte: twelveMonthsAgo, $lt: sixMonthsAgo },
        // accountId: new mongoose.Types.ObjectId(accountId),
        ...matchCondition,
        // serialNumber: serialNumber
      }
    },
    {
      $group: {
        _id: "$transactionType",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        transactionType: "$_id",
        totalAmount: 1,
        count: 1
      }
    }
  ]);

  // Merge the two results and calculate percentage increase
  const percentageIncrease = lastSixMonths.map(recent => {
    const previous = previousSixMonths.find(prev => prev.transactionType === recent.transactionType);

    const previousTotal = previous ? previous.totalAmount : 0;
    const recentTotal = recent.totalAmount;

    // Calculate percentage increase
    let percentage = 0;
    if (previousTotal > 0) {
      percentage = ((recentTotal - previousTotal) / previousTotal) * 100;
    } else if (previousTotal === 0 && recentTotal > 0) {
      percentage = 100; // If there was no transaction in the previous period but exists now
    }

    return {
      transactionType: recent.transactionType,
      recentTotalAmount: recentTotal,
      previousTotalAmount: previousTotal,
      percentageIncrease: percentage,

    };
  });

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_SINGLE_MACHINE_REPORTS,
    data: {
      lastSixWeeksDataForGraph: sixWeekAggregateFinalResult,
      totalSummaryOfMachine,
      machineTransactions,
      userActivity: userActivityResult,
      percentageIncrease
    }
  })
})


exports.validateAuthentication = asyncWrapper(async (req, res, next) => {
  const { accountId, serialNumbers, transactionTypes, fromDate, toDate } = req.query;
  const userActivity = await usersModel.findById(req.user._id)
  if (userActivity.status !== "active" || userActivity.authUser !== "OnePOS") {
    return res.josn("invalid User")
  }
  else {
    const serialNumbersArray =
      serialNumbers === "all"
        ? []
        : serialNumbers
          ? serialNumbers.split(",")
          : serialNumbers;

    const transactionTypesArray =
      transactionTypes === "all"
        ? []
        : transactionTypes
          ? transactionTypes.split(",")
          : transactionTypes;

    await onePosLogsModel.create({
      accountId: accountId,
      userId: req.user._id,
      serialNumbers: serialNumbersArray,
      transactionTypes: transactionTypesArray,
      authenticationDateAndTime: new Date(),
      authenticationCount: 1,
      apiCalled: req?.url.split('/')[1]
    })
    next()
  }
})


exports.getTransactionsReports = asyncWrapper(async (req, res) => {
  const { accountId, serialNumbers, transactionTypes, fromDate, toDate } = req.query;
  console.log('fromDate, toDate:===', fromDate, toDate)
  console.log("serialNumbers:===", serialNumbers);

  const serialNumbersArray =
    serialNumbers === "all"
      ? []
      : serialNumbers
        ? serialNumbers.split(",")
        : serialNumbers;

  const transactionTypesArray =
    transactionTypes === "all"
      ? []
      : transactionTypes
        ? transactionTypes.split(",")
        : transactionTypes;

  console.log("serialNumbersArray:===", serialNumbersArray);
  console.log("transactionTypesArray:===", transactionTypesArray);

  const matchConditions = {
    accountId: new mongoose.Types.ObjectId(accountId),
    // createdAt: { $gte: moment(fromDate).format('YYYY-MM-DDTHH:mm:ssZ'), $lte: moment(toDate).format('YYYY-MM-DDTHH:mm:ssZ').add(1)},
    createdAt: {
      $gte: new Date(moment(fromDate).format('YYYY-MM-DDTHH:mm:ss')),
      $lte: new Date(moment(toDate).add(1, 'day').format('YYYY-MM-DDTHH:mm:ss'))
    }
  };

  if (serialNumbersArray.length > 0) {
    matchConditions.serialNumber = { $in: serialNumbersArray };
  }

  if (transactionTypesArray.length > 0) {
    matchConditions.transactionType = { $in: transactionTypesArray };
  }
  console.log('matchConditions:==', matchConditions)
  const webhookTransactionDetails = await webhookPayloadTransactions.aggregate([
    { $match: matchConditions },
    { $sort: { createdAt: -1 } }
  ]);

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_TRANSACTIONS,
    data: {
      webhookTransactionDetails,
      // webhookTransactionHeadersDetails
    }
  })
})


exports.getProgressMeterAndTotalsOfSingleMachine = asyncWrapper(async (req, res) => {
  let { accountId, serialNumber } = req.query;


  // Get the current time
  const now = new Date();

  // Calculate time ranges
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const twelveMonthsAgo = new Date(sixMonthsAgo);
  twelveMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // First aggregation (last 6 months)
  const lastSixMonths = await webhookPayloadTransactions.aggregate([
    {
      // Convert the string to a proper date in a new field
      $addFields: {
        transactionDateTime: {
          $toDate: "$transactionDateTime"
        }
      }
    },
    {
      $match: {
        transactionDateTime: { $gte: sixMonthsAgo },
        accountId: new mongoose.Types.ObjectId(accountId),
        serialNumber: serialNumber
      }
    },
    {
      $group: {
        _id: "$transactionType",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        transactionType: "$_id",
        totalAmount: 1,
        count: 1
      }
    }
  ]);

  // Second aggregation (previous 6 months)
  const previousSixMonths = await webhookPayloadTransactions.aggregate([
    {
      // Convert the string to a proper date in a new field
      $addFields: {
        transactionDateTime: {
          $toDate: "$transactionDateTime"
        }
      }
    },


    {
      $match: {
        transactionDateTime: { $gte: twelveMonthsAgo, $lt: sixMonthsAgo },
        accountId: new mongoose.Types.ObjectId(accountId),
        serialNumber: serialNumber
      }
    },
    {
      $group: {
        _id: "$transactionType",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        transactionType: "$_id",
        totalAmount: 1,
        count: 1
      }
    }
  ]);

  // Merge the two results and calculate percentage increase
  const percentageIncrease = lastSixMonths.map(recent => {
    const previous = previousSixMonths.find(prev => prev.transactionType === recent.transactionType);

    const previousTotal = previous ? previous.totalAmount : 0;
    const recentTotal = recent.totalAmount;

    // Calculate percentage increase
    let percentage = 0;
    if (previousTotal > 0) {
      percentage = ((recentTotal - previousTotal) / previousTotal) * 100;
    } else if (previousTotal === 0 && recentTotal > 0) {
      percentage = 100; // If there was no transaction in the previous period but exists now
    }

    return {
      transactionType: recent.transactionType,
      recentTotalAmount: recentTotal,
      previousTotalAmount: previousTotal,
      percentageIncrease: percentage
    };
  });


  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_PROGRESS_METER_SINGLE_MACHINE,
    data: percentageIncrease
  })
})

exports.getExceptionsOfAccount = asyncWrapper(async (req, res) => {
  const { accountId } = req.params
  const exceptionsOfAccount = await webhookExceptionsModel.find({ accountId: new mongoose.Types.ObjectId(accountId) })
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_EXCEPTIONS,
    data: exceptionsOfAccount || []
  })
})


exports.getTransactionDenominations = asyncWrapper(async (req, res) => {
  const { serialNumbers, accountId } = req.query;

  let serialNumbersArray = [];
  if (serialNumbers && serialNumbers !== 'all') {
    serialNumbersArray = serialNumbers.includes(',')
      ? serialNumbers.split(',').map(s => s.trim())
      : [serialNumbers];
  }

  const matchCondition = {
    serialNumber: { $in: serialNumbersArray },
    transactionDateTime: {
      $gte: moment().utc().subtract(1, 'day').startOf('day').toDate(),
      $lte: moment().utc().endOf('day').toDate()
    }
  };

  console.log('matchCondition:==', matchCondition)

  const denominations = await webhookPayloadTransactions.aggregate([

    {
      $addFields: {
        transactionDateTime: { $toDate: '$transactionDateTime' }
      }
    },
    {
      $match: matchCondition
    },
    {
      $unwind: {
        path: '$denominations',
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $match: {
        'denominations.UnitValue': { $ne: null },
        'denominations.Count': { $ne: null },
        'denominations.Currency': { $ne: null }
      }
    },
    {
      $group: {
        _id: {
          unitValue: '$denominations.UnitValue',
          currency: '$denominations.Currency'
        },
        totalCount: {
          $sum: { $ifNull: ['$denominations.Count', 0] }
        },
        totalAmount: {
          $sum: {
            $multiply: [
              '$denominations.UnitValue',
              '$denominations.Count'
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        denominations: {
          $push: {
            UnitValue: '$_id.unitValue',
            Count: '$totalCount',
            Currency: '$_id.currency',
            Total: { $multiply: ['$_id.unitValue', '$totalCount'] }
          }
        },
        totalAmount: { $sum: '$totalAmount' }
      }
    },
    {
      $project: {
        _id: 0,
        denominations: {
          $slice: [
            {
              $sortArray: {
                input: '$denominations',
                sortBy: {
                  Total: -1,
                  UnitValue: -1
                }
              }
            },
            5
          ]
        },
        totalAmount: 1
      }
    }

  ]);

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_MACHINE_DENOMINATIONS,
    data: denominations[0] || {}
  })
});