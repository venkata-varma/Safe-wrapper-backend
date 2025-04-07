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

  await webHooksModel.create({
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
    createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }
  };

  if (serialNumbersArray.length > 0) {
    matchConditions.serialNumber = { $in: serialNumbersArray };
  }

  if (transactionTypesArray.length > 0) {
    matchConditions.transactionType = { $in: transactionTypesArray };
  }
  const webhookTransactionDetails = await webhookPayloadTransactions.aggregate([
    { $match: matchConditions },
    { $unwind: { path: "$denominations", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          serialNumber: "$serialNumber",
          transactionType: "$transactionType",
          unitValue: "$denominations.UnitValue",
          currency: "$denominations.Currency"
        },
        count: { $sum: "$denominations.Count" }, // Sum the counts correctly
        totalAmount: {
          $sum: { $multiply: ["$denominations.UnitValue", "$denominations.Count"] }
        },
        webhookTransactionId: { $first: "$webhookTransactionId" },
        webhookMasterId: { $first: "$webhookMasterId" },
        webhookMetaPayloadId: { $first: "$webhookMetaPayloadId" },
        accountId: { $first: "$accountId" },
        location: { $first: "$location" },
        userName: { $first: "$userName" },
        transactionDateTime: { $first: "$transactionDateTime" }
      }
    },

    {
      $group: {
        _id: {
          serialNumber: "$_id.serialNumber",
          transactionType: "$_id.transactionType"
        },
        totalAmount: { $sum: "$totalAmount" }, // Sum totalAmount correctly
        location: { $first: "$location" },
        userName: { $first: "$userName" },
        webhookTransactionId: { $first: "$webhookTransactionId" },
        webhookMasterId: { $first: "$webhookMasterId" },
        webhookMetaPayloadId: { $first: "$webhookMetaPayloadId" },
        accountId: { $first: "$accountId" },
        transactionDateTime: { $first: "$transactionDateTime" },
        denominations: {
          $push: {
            UnitValue: "$_id.unitValue",
            Currency: "$_id.currency",
            Count: "$count"
          }
        }
      }
    },

    {
      $group: {
        _id: null,
        transactionDetails: {
          $push: {
            serialNumber: "$_id.serialNumber",
            transactionType: "$_id.transactionType",
            totalAmount: "$totalAmount",
            location: "$location",
            userName: "$userName",
            webhookTransactionId: "$webhookTransactionId",
            webhookMasterId: "$webhookMasterId",
            webhookMetaPayloadId: "$webhookMetaPayloadId",
            accountId: "$accountId",
            transactionDateTime: "$transactionDateTime",
            denominations: "$denominations"
          }
        },
        grandTotal: { $sum: "$totalAmount" } // Sum all transactions correctly
      }
    },

    {
      $project: {
        _id: 0,
        transactionDetails: 1,
        grandTotal: 1
      }
    }
  ]);


  /*
  const webhookTransactionHeadersDetails = await webhookPayloadHeaders.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: {
          serialNumber: "$serialNumber",
          transactionType: "$transactionType"
        },
        transactionHeaderData: { $push: "$$ROOT" },
        transactionDateTime: {$first:"$transactionDateTime"},
        location: { $first: "$location" },
        userName: { $first: "$userName" },
        webhookPayloadHeaderId: { $first: "$webhookPayloadHeaderId" },
        webhookMasterId: { $first: "$webhookMasterId" },
        webhookMetaPayloadId: { $first: "$webhookMetaPayloadId" },
        accountId: { $first: "$accountId" },
      }
    },
    {
      $group: {
        _id: null,
        transactionHeaderDetails: {
          $push: {
            serialNumber: "$_id.serialNumber",
            transactionType: "$_id.transactionType",
            transactionDateTime:"$transactionDateTime",
            location: "$location",
            userName:"$userName",
            webhookPayloadHeaderId: "$webhookPayloadHeaderId",
            webhookMasterId: "$webhookMasterId",
            webhookMetaPayloadId: "$webhookMetaPayloadId",
            accountId: "$accountId",
            transactionHeaderData: "$transactionHeaderData",
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        transactionHeaderDetails: 1,
      }
    }
  ]);
  */



  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_TRANSACTIONS,
    data: {
      webhookTransactionDetails,
      // webhookTransactionHeadersDetails
    }
  })
})


exports.getAllWebhookPayoadHeadersOfAccount = asyncWrapper(async (req, res) => {
  const { accountId } = req.params
  const webhookPayloadHeadersData = await webhookPayloadHeaders.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
      },
    },
    {
      $group: {
        _id: null,
        serialNumbers: { $addToSet: "$serialNumber" },
        transactionTypes: { $addToSet: "$transactionType" },
      },
    },
    {
      $project: {
        _id: 0,
        serialNumbers: 1,
        transactionTypes: 1,
      },
    },
  ]);
  const listOfWebhooks = await webHooksMasterModel.find({accountId:accountId})
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBHOOK_PAYLOAD_HEADERS,
    data: {
      webhookPayloadHeadersData: webhookPayloadHeadersData?.[0] || {},
      listOfWebhooks: listOfWebhooks
    }
  })
})



exports.getDashboardStatasticsOfAccount = asyncWrapper(async (req, res) => {
  const { accountId } = req.params
  const lastSixMonthsDataForGraph = await webhookPayloadTransactions.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
        createdAt: {
          $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
          $lte: new Date()
        }
      }
    },
    {
      $group: {
        _id: {
          serialNumber: "$serialNumber",
          transactionType: "$transactionType",
        },
        totalAmount: { $sum: "$amount" }

      }
    },
    {
      $group: {
        _id: null,
        serialNumbers: { $addToSet: "$_id.serialNumber" },
        transactionTypes: { $addToSet: "$_id.transactionType" },
        totalAmount: { $sum: "$totalAmount" }
      }
    },
    {
      $project: {
        _id: 0,
        serialNumbersCount: { $size: "$serialNumbers" },
        transactionTypesCount: { $size: "$transactionTypes" },
        totalAmount: 1
      }
    }
  ]);

  const predefinedStatuses = ["received", "in-progress", "executed", "execution-failed"];

  let webhookPayloadStatusDetails = await webhookMetaPayloadModel.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
        createdAt: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
          $lte: new Date()
        }
      }
    },
    {
      $lookup: {
        from: "webhookpayloadtransactions",
        foreignField: "accountId",
        localField: "accountId",
        as: "webhooktransactionsresults"
      }
    },
    {
      $unwind: {
        path: "$webhooktransactionsresults",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        "webhooktransactionsresults.userName": { $ne: "", $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        serialNumbers: { $addToSet: "$webhooktransactionsresults.serialNumber" },
        transactionTypes: { $addToSet: "$webhooktransactionsresults.transactionType" },
        users: { $addToSet: "$webhooktransactionsresults.userName" },
        locations: { $addToSet: "$webhooktransactionsresults.location" }
      }
    },
    {
      $lookup: {
        from: "webhookmetapayloads",
        pipeline: [
          {
            $match: { accountId: new mongoose.Types.ObjectId(accountId) }
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 }
            }
          }
        ],
        as: "statusCountsData"
      }
    },
    {
      $addFields: {
        statusCounts: {
          $map: {
            input: predefinedStatuses,
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
                              cond: { $eq: ["$$s._id", "$$status"] }
                            }
                          },
                          0
                        ]
                      }
                    }
                  },
                  0
                ]
              }
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        serialNumbersCount: { $size: { $ifNull: ["$serialNumbers", []] } },
        transactionTypesCount: { $size: { $ifNull: ["$transactionTypes", []] } },
        usersCount: { $size: { $ifNull: ["$users", []] } },
        locationsCount: { $size: { $ifNull: ["$locations", []] } },
        statusCounts: 1
      }
    }
  ]);

  const webhookPayloadDenominationsData = await webhookPayloadHeaders.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
      },
    },
    {
      $lookup: {
        from: "webhookpayloadtransactions",
        localField: "webhookMasterId",
        foreignField: "webhookMasterId",
        as: "webhookTransactions",
      },
    },
    {
      $addFields: {
        webhookTransactions: {
          $filter: {
            input: "$webhookTransactions",
            as: "txn",
            cond: {
              $and: [
                { $eq: ["$$txn.serialNumber", "$serialNumber"] },
                { $eq: ["$$txn.transactionType", "$transactionType"] }
              ]
            }
          }
        }
      }
    },
    {
      $unwind: {
        path: "$webhookTransactions",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: "$webhookTransactions.denominations",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: {
          serialNumber: "$webhookTransactions.serialNumber",
          transactionType: "$webhookTransactions.transactionType",
          unitValue: "$webhookTransactions.denominations.UnitValue",
          currency: "$webhookTransactions.denominations.Currency"
        },
        totalCount: { $sum: { $ifNull: ["$webhookTransactions.denominations.Count", 0] } },
        totalAmount: {
          $sum: { $multiply: ["$webhookTransactions.denominations.UnitValue", "$webhookTransactions.denominations.Count"] }
        },
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
          $ifNull: ["$denominations", []]
        },
        totalAmount: "$totalAmount"
      }
    }
  ]);


  const webhookTransactionsDetails = await webhookPayloadTransactions.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
        createdAt: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
          $lte: new Date()
        }
      }
    },
    { $unwind: { path: "$denominations", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$serialNumber",
        count: { $sum: 1 },
        totalAmount: {
          $sum: { $multiply: ["$denominations.UnitValue", "$denominations.Count"] }
        },
      }
    },
    {
      $group: {
        _id: null,
        transactionDetails: {
          $push: {
            serialNumber: "$_id", count: "$count", totalAmount: "$totalAmount"
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        transactionDetails: 1
      }
    }
  ])

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_DASHBOARD_STATASTICS,
    data: {
      lastSixMonthsDataForGraph,
      webhookPayloadStatusDetails,
      webhookPayloadDenominationsData,
      webhookTransactionsDetails
    }
  })
})


exports.getListOfMachines = asyncWrapper(async(req,res)=>{
  const {accountId, webhookMasterId} = req.query
  const listOfMachines = await webhookPayloadHeaders.find({accountId:accountId, webhookMasterId:webhookMasterId})
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_DASHBOARD_STATASTICS,
    data: listOfMachines
  })
})


exports.getAllMachineReports = asyncWrapper(async(req,res)=>{
  const {accountId} = req.query

  const machineDetails = await webhookPayloadHeaders.find({accountId:accountId})

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status:customConstants.messages.MESSAGE_SUCCESS,
    message:customConstants.messages.MESSAGE_WEBOOK_GET_MACHINE_REPORTS,
    data:machineDetails
  })

})

exports.getSingleMachineDetails = asyncWrapper(async(req,res)=>{
  const {serialNumber, accountId, webhookMasterId} = req.query
  const singleMachineReport = await webhookPayloadTransactions.find({accountId:accountId,webhookMasterId:webhookMasterId,serialNumber:serialNumber})
  
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status:customConstants.messages.MESSAGE_SUCCESS,
    message:customConstants.messages.MESSAGE_WEBOOK_GET_SINGLE_MACHINE_REPORTS,
    data:singleMachineReport
  })
})