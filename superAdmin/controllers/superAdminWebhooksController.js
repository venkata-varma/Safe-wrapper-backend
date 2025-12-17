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
const { insertPosLogs } = require("../../utils/utilsFunctions");
const { authentication } = require("../../utils/authentication");
const { dashboardFiltersSafeCash, dashboardFiltersCardConnect, getSummaryDetails } = require("../../customer/controllers/smartDashboardFunctions");
let { getAllCardConnectPayloadHeaders } = require('../../cardConnect/controllers/cardConnectIntegrationsMasterDataPointsController')
let { getAllCardConnectExceptions } = require('./superAdminAccountControllers')

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
  const { webhookMasterId, accountId } = req.query
  let individualWebhookDetails = await webHooksMasterModel.find(
    {
      _id: new mongoose.TYpes.ObjectId(webhookMasterId),
      accountId: new mongoose.TYpes.ObjectId(accountId)
    }
  )

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
    .findById(req.query.accountId)
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

exports.validateWebhookandAccount = asyncWrapper(async (req, res, next) => {
  const { webhookMasterId } = req.query;

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
  const { webhookMasterId } = req.query;

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

  let transactionTypesArray = [];
  if (transactionTypes && transactionTypes !== 'all') {
    transactionTypesArray = transactionTypes.includes(',')
      ? transactionTypes.split(',').map((t) => t.trim())
      : [transactionTypes];
  }

  if (req?.user?.authUser === "OnePOS") {
    await insertPosLogs(
      req.user.accountId._id,
      req.user._id,
      req.url,
      serialNumbersArray,
      transactionTypesArray,
      fromDate,
      toDate
    );
  }

  const matchConditions = {
    transactionDateTime: {
      $gte: moment(fromDate).toDate(),
      $lte: moment(toDate).toDate(),
    },
  };

  if (serialNumbersArray.length > 0) {
    matchConditions.serialNumber = { $in: serialNumbersArray };
  }

  if (transactionTypesArray.length > 0) {
    matchConditions.transactionType = { $in: transactionTypesArray };
  }


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


exports.getAllWebhookPayoadHeadersOfAllAccounts = asyncWrapper(async (req, res) => {
  const { serialNumber } = req.query
  let matchCondition = {}
  let categories = ["cima-machine", "card-connect"]

  let merchantNames = await accountsModel.aggregate([
    {
      $match: {
        status: "active",

        accountName: { $nin: ["", null] },
        $expr: { $eq: [{ $type: "$accountName" }, "string"] }
      }
    },

    {
      $group: {
        _id: "$_id",                // group by unique record id
        merchantName: { $first: "$accountName" },
        machines: { $first: "$machines" }
      }
    },
    {
      $project: {
        _id: 0,
        objectId: "$_id",           // keep original _id as objectId
        merchantName: 1,
        machines: 1
      }
    }

  ])

  const webhookPayloadHeadersData = await webhookPayloadHeaders.aggregate([
    // {
    //   $match: {
    //     ...matchCondition
    //   }
    // },
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
        // userNamesOfMachine: 1
      }
    }
  ]);

  let allMerchantCardConnectPayloadHeaders = await getAllCardConnectPayloadHeaders()




  // const listOfWebhooks = await webHooksMasterModel.find({})
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBHOOK_PAYLOAD_HEADERS,
    data: {
      categories,
      merchantNames,
      webhookPayloadHeadersData: webhookPayloadHeadersData?.[0] || {},
      allMerchantCardConnectPayloadHeaders: allMerchantCardConnectPayloadHeaders
      // listOfWebhooks: listOfWebhooks
    }
  })
})




exports.getAllWebhookPayoadHeadersOfAllAccountsFn = async () => {
  const categories = ["cima-machine", "card-connect"];

  // 🔹 Run all independent queries in parallel
  const [
    merchantNames,
    webhookPayloadHeadersData,
    allMerchantCardConnectPayloadHeaders
  ] = await Promise.all([
    // 1. Get merchant names
    accountsModel.aggregate([
      {
        $match: {
          status: "active",

          accountName: { $nin: ["", null] },
          $expr: { $eq: [{ $type: "$accountName" }, "string"] }
        }
      },

      {
        $group: {
          _id: "$_id",                // group by unique record id
          merchantName: { $first: "$accountName" }
        }
      },
      {
        $project: {
          _id: 0,
          objectId: "$_id",           // keep original _id as objectId
          merchantName: 1
        }
      }
    ]),

    // 2. Get webhook payload headers
    webhookPayloadHeaders.aggregate([
      {
        $addFields: {
          userName: {
            $cond: {
              if: { $eq: ["$userName", ""] },
              then: "unknown",
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
          // userNamesOfMachine: 1
        }
      }
    ]),

    // 3. Get card connect payload headers for all merchants
    getAllCardConnectPayloadHeaders()
  ]);

  return {
    categories,
    merchantNames,
    webhookPayloadHeadersData: webhookPayloadHeadersData?.[0] || {},
    allMerchantCardConnectPayloadHeaders
  };
};


exports.getDashboardStatisticsOfAccount = asyncWrapper(async (req, res) => {
  const { accountId } = req.params
  let matchCondition = {}
  if (req.user.accountId.accountType === "merchant") {
    matchCondition = {
      serialNumber: req.user.accountId.machines
    }
  }
  else {
    matchCondition = {
      accountId: new mongoose.Types.ObjectId(accountId)
    }
  }

  let getLastSiWeeksResult = getSixWeeksSalesFunction()

  const fromDate = getLastSiWeeksResult[0].fromDate;
  const toDate = getLastSiWeeksResult[getLastSiWeeksResult.length - 1].toDate;

  const aggregationPipeline = [
    {
      $match: {
        // accountId: new mongoose.Types.ObjectId(accountId),
        // ...matchCondition,
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


  let payloadSummary = []
  const [
    metaPayloadQuery,
    transactionsQuery,
    exceptionsCount
  ] = await Promise.all([
    webhookMetaPayloadModel.aggregate([
      {
        $lookup: {
          from: "webhookpayloadheaders",
          localField: "_id",
          foreignField: "webhookMetaPayloadId",
          as: "payloadHeader"
        }
      },
      {
        $addFields: {
          payloadHeader: { $arrayElemAt: ["$payloadHeader", 0] }
        }
      },
      {
        $addFields: {
          transactionDateTime: { $toDate: "$payloadHeader.transactionDateTime" }
        }
      },
      {
        $project: {
          payloadHeader: 0
        }
      },

      {
        $match: {

          transactionDateTime: {
            $gte: moment().utc().subtract(1, 'day').startOf('day').toDate(),
            $lte: moment().utc().endOf('day').toDate()
          },
        }
      },
      {
        $facet: {
          statusCounts: [
            // {
            //   $match: {
            //     ...metaPayloadMatchCondition,
            //   },
            // },
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
            // {
            //   $match: {
            //     $expr: { $in: ["$primaryHookId", matchCondition.serialNumber.$in || []] },
            //   },
            // },
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
            // {
            //   $match: {
            //     ...metaPayloadMatchCondition,
            //   },
            // },
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
    ]),
    webhookPayloadTransactions.aggregate([
      {
        $addFields: {
          transactionDateTime: { $toDate: '$transactionDateTime' }
        }
      },
      {
        $match: {
          // ...matchCondition,
          transactionDateTime: {
            $gte: moment().utc().subtract(1, 'day').startOf('day').toDate(),
            $lte: moment().utc().endOf('day').toDate()
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
    ]),
    webhookExceptionsModel.find({}
      // { accountId: accountId }
      // matchCondition
    ).countDocuments()
  ]);

  payloadSummary = [{ ...metaPayloadQuery[0], ...transactionsQuery[0] }]




  const totalAccountSummary = await webhookPayloadTransactions.aggregate([
    {
      $match: {
        // accountId: new mongoose.Types.ObjectId(accountId),
        // ...matchCondition,
        userName: { $ne: "", $exists: true }
      }
    },
    {
      $addFields: {
        hasDenominations: {
          $gt: [{ $size: { $ifNull: ["$denominations", []] } }, 0]
        }
      }
    },
    {
      $group: {
        _id: null,
        transactionCount: {
          $sum: {
            $cond: ["$hasDenominations", 1, 0]
          }
        },
        serialNumbers: { $addToSet: "$serialNumber" },
        users: { $addToSet: "$userName" },
        transactions: { $push: "$$ROOT" }
      }
    },
    {
      $unwind: {
        path: "$transactions"
      }
    },
    {
      $unwind: {
        path: "$transactions.denominations",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: null,
        transactionCount: { $first: "$transactionCount" },
        serialNumbers: { $first: "$serialNumbers" },
        users: { $first: "$users" },
        totalAmount: {
          $sum: {
            $multiply: [
              "$transactions.denominations.UnitValue",
              "$transactions.denominations.Count"
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        transactionCount: 1,
        serialNumbersCount: { $size: "$serialNumbers" },
        usersCount: { $size: "$users" },
        totalRevenue: "$totalAmount",
        exceptionsCount: { $literal: exceptionsCount }
      }
    }
  ]);

  let [topFiveDeviceDetails, denominations, latestTransactions, topFiveUsersDetails] = await Promise.all([
    webhookPayloadTransactions.aggregate([
      {
        $addFields: {
          transactionDateTime: { $toDate: '$transactionDateTime' }
        }
      },
      {
        $match: {
          //  ...matchCondition,
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
    ]),
    webhookPayloadTransactions.aggregate([
      {
        $match: {
          // accountId: new mongoose.Types.ObjectId(accountId),
          // ...matchCondition,
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
    ]),
    webhookPayloadTransactions.aggregate([
      {
        $match: {
          // accountId: new mongoose.Types.ObjectId(accountId),
          // ...matchCondition,
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
    ]),
    webhookPayloadTransactions.aggregate([
      {
        $addFields: {
          transactionDateTime: { $toDate: '$transactionDateTime' }
        }
      },
      {
        $match: {
          // ...matchCondition,
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
    ])
  ])


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

  // const listOfMachines = await webhookPayloadHeaders.find({ accountId: accountId }).sort({ _id: -1 })
  const listOfMachines = await webhookPayloadHeaders.find({}).sort({ _id: -1 })

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
      serialNumber: req.user.accountId.machines
    }
  }
  else {
    matchCondition = {
      accountId: new mongoose.Types.ObjectId(accountId)
    }
  }

  const predefinedStatuses = ["received", "in-progress", "executed", "execution-failed"];

  const machineDetails = await webhookPayloadHeaders.aggregate([

    // --- SORT TO PICK LATEST RECORD PER MACHINE ---
    { $sort: { createdAt: -1 } },

    // --- UNIQUE MACHINES ---
    {
      $group: {
        _id: {
          serialNumber: "$serialNumber",
          //location: "$location",
          accountId: "$accountId"
        }
      }
    },

    // --- LOOKUP TRANSACTION COUNTS & AMOUNTS ---
    {
      $lookup: {
        from: "webhookpayloadtransactions",
        let: {
          sn: "$_id.serialNumber",
          //    loc: "$_id.location",
          acc: "$_id.accountId"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$serialNumber", "$$sn"] },
                  //  { $eq: ["$location", "$$loc"] },
                  { $eq: ["$accountId", "$$acc"] }
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              transactionsCount: { $sum: 1 },
              totalAmount: { $sum: "$amount" }
            }
          }
        ],
        as: "tx"
      }
    },

    // --- LOOKUP META PAYLOAD STATUSES ---
    {
      $lookup: {
        from: "webhookmetapayloads",
        let: {
          sn: "$_id.serialNumber",
          //  loc: "$_id.location"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$primaryHookId", "$$sn"] },
                  // {
                  //   $eq: [
                  //     {
                  //       $arrayElemAt: [
                  //         "$dataPoint.Metadata.LocationInformation.Location",
                  //         0
                  //       ]
                  //     },
                  //     "$$loc"
                  //   ]
                  // }
                ]
              }
            }
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 }
            }
          }
        ],
        as: "rawStatusCounts"
      }
    },

    // --- BUILD statusCount OBJECT WITH ALL PREDEFINED STATUSES (INCLUDING ZERO) ---
    {
      $addFields: {
        statusCount: {
          $arrayToObject: {
            $map: {
              input: predefinedStatuses,
              as: "st",
              in: {
                k: "$$st",
                v: {
                  $let: {
                    vars: {
                      match: {
                        $first: {
                          $filter: {
                            input: "$rawStatusCounts",
                            as: "rc",
                            cond: { $eq: ["$$rc._id", "$$st"] }
                          }
                        }
                      }
                    },
                    in: { $ifNull: ["$$match.count", 0] }
                  }
                }
              }
            }
          }
        }
      }
    },

    // --- FINAL PROJECT ---
    {
      $project: {
        _id: 0,
        serialNumber: "$_id.serialNumber",
        //  location: "$_id.location",
        accountId: "$_id.accountId",

        transactionsCount: {
          $ifNull: [{ $arrayElemAt: ["$tx.transactionsCount", 0] }, 0]
        },
        totalAmount: {
          $ifNull: [{ $arrayElemAt: ["$tx.totalAmount", 0] }, 0]
        },

        statusCount: 1
      }
    }

  ]);



  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_MACHINE_REPORTS,
    machineByLocationsLength: machineDetails.length,
    data: machineDetails
  })

})

exports.getPayloadReports = asyncWrapper(async (req, res) => {
  const { serialNumber, accountId, webhookMasterId } = req.query
  let matchCondition = {}
  if (req.user.accountId.accountType === "merchant") {
    matchCondition = {
      serialNumber: req.user.accountId.machines
    }
  }
  else {
    matchCondition = {
      accountId: new mongoose.Types.ObjectId(accountId),
      serialNumber: serialNumber
    }
  }

  let getLastSiWeeksResult = getSixWeeksSalesFunction()

  const fromDate = getLastSiWeeksResult[0].fromDate;
  const toDate = getLastSiWeeksResult[getLastSiWeeksResult.length - 1].toDate

  const lastSixWeeksDataForGraph = await webhookPayloadTransactions.aggregate([
    {
      $match: {
        serialNumber: serialNumber,
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
        // ...matchCondition,
        serialNumber: serialNumber,
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

  const machineTransactions = await webhookPayloadTransactions.find({ serialNumber: serialNumber })

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
        // ...matchCondition,
        serialNumber: serialNumber,
        // createdAt: {
        //   $gte: startDate,
        //   $lt: endDate
        // }
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
        // ...matchCondition,
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
        // accountId: new mongoose.Types.ObjectId(accountId),
        // ...matchCondition,
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
    return res.json("invalid User")
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


exports.getAllExceptionsWithFilters = asyncWrapper(async (req, res) => {
  let machineCashExceptions = [];
  let cardConnectExceptions = []
  let { fromDate, toDate, paymentType } = req.query;

  fromDate = new Date(moment(fromDate).format('YYYY-MM-DDTHH:mm:ss'))
  toDate = new Date(moment(toDate).format('YYYY-MM-DDTHH:mm:ss'))



  if (paymentType === "cima-machine") {
    machineCashExceptions = await webhookExceptionsModel.aggregate([
      {
        $addFields: {
          paymentType: "cima-machine"
        }
      },
      {
        $match: {
          createdAt: {
            $gte: fromDate,
            $lte: toDate
          }
        }
      },

      {
        $sort: {
          createdAt: -1
        }
      }

    ])
  }
  if (paymentType === "card-connect") {
    cardConnectExceptions = await getAllCardConnectExceptions(fromDate, toDate, paymentType)
  }
  let allExceptionsCount = machineCashExceptions.length > 0 ? machineCashExceptions.length : cardConnectExceptions.length > 0 ? cardConnectExceptions.length : 0
  let allExceptions = [

    ...machineCashExceptions,
    ...cardConnectExceptions
  ]

  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_WEBOOK_GET_EXCEPTIONS,
    data: {
      allExceptionsCount,
      allExceptions
    }



  })
})


exports.getExceptionsOfAccount = asyncWrapper(async (req, res) => {
  const exceptionsOfAccount = await webhookExceptionsModel.find({})
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


exports.updateWebhookStatus = asyncWrapper(async (req, res) => {
  const { webhookMasterId, status } = req.query
  const updateStatus = await webHooksMasterModel.findByIdAndUpdate(webhookMasterId, { $set: { status: status } }, { new: true, runValidators: true });
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).
    json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_WEBHOOK_MASTER_STATUS_UPDATED,
    })
})

exports.updateWebhookAutoDataSyncStatus = asyncWrapper(async (req, res) => {
  const { webhookMasterId, status } = req.query
  await webHooksMasterModel.findByIdAndUpdate(webhookMasterId, {
    $set: { "webhookSettings.currentStatus": status }
  }, { new: true, upsert: true });
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).
    json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: status === 'start' ? customConstants.messages.MESSAGE_SETTINGS_AUTO_DATA_SYNC_STARTED : status === 'stop' ? customConstants.messages.MESSAGE_SETTINGS_AUTO_DATA_SYNC_STOPPED : "",
    })
})

exports.getWebhookDetailsOfAccount = asyncWrapper(async (req, res) => {
  const { accountId } = req.query
  let webhookMetaPayloadsDetails
  let exceptionsCount = await webhookExceptionsModel.find({}).countDocuments()
  let accountDetails = await accountsModel.findById(accountId, { password: 0 }).lean()
  let webhookTransactionDetails = await webhookPayloadTransactions.aggregate([

    {
      $group: {
        _id: null,
        serialNumbers: { $addToSet: "$serialNumber" },
        transactionsWithPositiveAmount: {
          $sum: {
            $cond: [{ $gt: ["$amount", 0] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,

        serialNumbersCount: { $size: "$serialNumbers" },
        transactionsCount: "$transactionsWithPositiveAmount",
        exceptionsCount: { $literal: exceptionsCount }
      }
    },
  ])

  let webhookDetails = await webHooksMasterModel.aggregate([
    {
      $match: {
        // accountId: new mongoose.Types.ObjectId(accountId),
        status: "active"
      }
    },
    {
      $project: {
        authenticationCode: 0,
        webHookUrl: 0
      }
    },
    {
      $lookup: {
        from: 'webhookmetapayloads',
        localField: '_id',
        foreignField: 'webhookMasterId',
        as: 'webhookpayloads'
      }
    },
    {
      $unwind: {
        path: '$webhookpayloads',
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $group: {
        _id: '$_id',
        originalDoc: { $first: '$$ROOT' },
        webhookpayloads: { $push: '$webhookpayloads' }
      }
    },
    {
      $facet: {
        results: [
          {
            $project: {
              _id: '$originalDoc._id',
              webhookMaster: {
                $mergeObjects: [
                  {
                    $arrayToObject: {
                      $filter: {
                        input: { $objectToArray: '$originalDoc' },
                        as: 'field',
                        cond: { $ne: ['$$field.k', 'webhookpayloads'] }
                      }
                    }
                  },
                  { _id: '$originalDoc._id' }
                ]
              },
              statusCounts: {
                $map: {
                  input: ['received', 'in-progress', 'executed', 'execution-failed'],
                  as: 'status',
                  in: {
                    status: '$$status',
                    count: {
                      $size: {
                        $filter: {
                          input: '$webhookpayloads',
                          as: 'payload',
                          cond: { $eq: ['$$payload.status', '$$status'] }
                        }
                      }
                    }
                  }
                }
              },
              payloadsCount: { $size: '$webhookpayloads' },
              serialNumbersCount: {
                $size: {
                  $setUnion: [
                    { $map: { input: '$webhookpayloads', as: 'payload', in: '$$payload.primaryHookId' } },
                    []
                  ]
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              webhookMaster: 1,
              statusCounts: 1,
              payloadsCount: 1,
              serialNumbersCount: 1
            }
          }
        ]
      }
    },
    {
      $unwind: '$results'
    },
    {
      $replaceRoot: { newRoot: '$results' }
    },
  ]);
  if (webhookDetails.length > 0) {
    webhookMetaPayloadsDetails = await webhookMetaPayloadModel.aggregate([
      {
        $match: {
          // accountId: new mongoose.Types.ObjectId(accountId),
          webhookMasterId: new mongoose.Types.ObjectId(webhookDetails[0]?.webhookMaster?._id)
        }
      },
      {
        $project: {
          serialNumber: "$primaryHookId",
          transactionDateAndTime: "$createdAt",
          location: { $arrayElemAt: ["$dataPoint.Metadata.LocationInformation.Location", 0] },
          name: { $arrayElemAt: ["$dataPoint.Metadata.LocationInformation.Name", 0] },
          dataPoint: 1,
          _id: 0
        }
      }
    ]);
  } else {
    webhookMetaPayloadsDetails = []
  }


  const onePosLogs = await onePosLogsModel.aggregate([
    {
      $project: {
        isActive: { $gte: ["$expirationTime", new Date()] },
        isExpired: { $lt: ["$expirationTime", new Date()] },
        authenticationCount: 1,
        serialNumbers: 1,
        transactionTypes: 1,
        transactionDateAndTimes: 1
      }
    },
    {
      $facet: {
        mainStats: [
          {
            $group: {
              _id: null,
              activeUsers: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
              expiredSessions: { $sum: { $cond: [{ $eq: ["$isExpired", true] }, 1, 0] } },
              totalAuthenticationCount: { $sum: "$authenticationCount" },
              allSerialNumbers: { $addToSet: "$serialNumbers" },
              allTransactionTypes: { $addToSet: "$transactionTypes" }
            }
          },
          {
            $project: {
              _id: 0,
              activeUsers: 1,
              expiredSessions: 1,
              totalAuthenticationCount: 1,
              allSerialNumbers: {
                $reduce: {
                  input: "$allSerialNumbers",
                  initialValue: [],
                  in: { $setUnion: ["$$value", "$$this"] }
                }
              },
              allTransactionTypes: {
                $reduce: {
                  input: "$allTransactionTypes",
                  initialValue: [],
                  in: { $setUnion: ["$$value", "$$this"] }
                }
              },
              serialNumberCount: {
                $size: {
                  $reduce: {
                    input: "$allSerialNumbers",
                    initialValue: [],
                    in: { $setUnion: ["$$value", "$$this"] }
                  }
                }
              },
              transactionTypeCount: {
                $size: {
                  $reduce: {
                    input: "$allTransactionTypes",
                    initialValue: [],
                    in: { $setUnion: ["$$value", "$$this"] }
                  }
                }
              }
            }
          },
          {
            $project: {
              activeUsers: 1,
              expiredSessions: 1,
              totalAuthenticationCount: 1,
              allSerialNumbers: "$allSerialNumbers",
              allTransactionTypes: "$allTransactionTypes",
              serialNumberCount: 1,
              transactionTypeCount: 1
            }
          }
        ],
        serialNumberStats: [
          { $unwind: "$serialNumbers" },
          {
            $group: {
              _id: "$serialNumbers",
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 0,
              topSerialNumber: "$_id"
            }
          }
        ],
        transactionTypeStats: [
          { $unwind: "$transactionTypes" },
          {
            $group: {
              _id: "$transactionTypes",
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 0,
              topTransactionType: "$_id"
            }
          }
        ],
        transactionDateStats: [
          { $unwind: "$transactionDateAndTimes" },
          {
            $group: {
              _id: "$transactionDateAndTimes",
              count: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: null,
              dates: {
                $push: {
                  date: "$_id",
                  count: "$count"
                }
              },
              maxCount: { $max: "$count" }
            }
          },
          {
            $project: {
              _id: 0,
              topTransactionDateAndTime: {
                $map: {
                  input: {
                    $filter: {
                      input: "$dates",
                      as: "item",
                      cond: { $eq: ["$$item.count", "$maxCount"] }
                    }
                  },
                  as: "item",
                  in: "$$item.date"
                }
              },
              transactionDateCount: "$maxCount"
            }
          }
        ]
      }
    },
    {
      $project: {
        activeUsers: { $arrayElemAt: ["$mainStats.activeUsers", 0] },
        expiredSessions: { $arrayElemAt: ["$mainStats.expiredSessions", 0] },
        totalAuthenticationCount: { $arrayElemAt: ["$mainStats.totalAuthenticationCount", 0] },
        allSerialNumbers: { $arrayElemAt: ["$mainStats.allSerialNumbers", 0] },
        allTransactionTypes: { $arrayElemAt: ["$mainStats.allTransactionTypes", 0] },
        topSerialNumber: { $arrayElemAt: ["$serialNumberStats.topSerialNumber", 0] },
        serialNumberCount: { $arrayElemAt: ["$mainStats.serialNumberCount", 0] },
        topTransactionType: { $arrayElemAt: ["$transactionTypeStats.topTransactionType", 0] },
        transactionTypeCount: { $arrayElemAt: ["$mainStats.transactionTypeCount", 0] },
        topTransactionDateAndTime: { $arrayElemAt: ["$transactionDateStats.topTransactionDateAndTime", 0] },
        transactionDateCount: { $arrayElemAt: ["$transactionDateStats.transactionDateCount", 0] }
      }
    }
  ]);

  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GET_ALL_WEBHOOK,
      data: {
        webhookDetails, webhookMetaPayloadsDetails, onePosLogs: onePosLogs?.[0],
        accountDetails: { ...accountDetails, ...webhookTransactionDetails?.[0] }
      }
    });

})


exports.getOneHubPosLogsDetails = asyncWrapper(async (req, res) => {
  const { serialNumber } = req.query
  const oneHubposDetails = await onePosLogsModel.find({ serialNumbers: { $in: [serialNumber] } })
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GET_ONE_HUB_POS_LOGS,
      data: oneHubposDetails
    });
})



exports.superAdminSmartFilteredDashboard = asyncWrapper(async (req, res) => {
  let { selectDashboard, merchantNames } = req.query
  let returnDashboardFiltersSafeCash;
  let returnDashboardFiltersCardConnect;
  let cashAndCardMixResultArray = []
  let selectDashboardArray = selectDashboard.split(',')
  let merchantNamesArray = merchantNames.split(',')

  if (!selectDashboard) {
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_CASH_OR_AND_CARD_TRANSACTIONS_RETREIVED,
    })
  }
  if (!merchantNames) {
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_MERCHANT_NAMES_MANDATORY,
    })
  }
  let { fromDate, toDate } = req.query  //From date and to date are constant 
  let { serialNumbers, cashTransactionTypes, } = req.query   //Filters of cima-machine
  let { cardTransactionTypes, cardTransactionStatus, customerDetails, batchNumber, } = req.query    // Filters of Card-connect

  if (selectDashboardArray.includes('cima-machine')) {
    returnDashboardFiltersSafeCash = await dashboardFiltersSafeCash(fromDate, toDate, merchantNamesArray, selectDashboardArray, serialNumbers, cashTransactionTypes, "")
  }

  if (selectDashboardArray.includes('card-connect')) {

    returnDashboardFiltersCardConnect = await dashboardFiltersCardConnect(cardTransactionTypes, cardTransactionStatus, customerDetails, batchNumber, fromDate, toDate, "", merchantNamesArray, selectDashboardArray)

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



  //--------------------------------------------------------------------------------------------------------------------------------
  let machineSummaryDetails = {
    totalTransactionsCount: returnDashboardFiltersSafeCash ? returnDashboardFiltersSafeCash.length : 0,
    totalMachinesCount: 0,
    totalTransactionTypesCount: 0,
    successfulTransactionsCount: returnDashboardFiltersSafeCash ? returnDashboardFiltersSafeCash.length : 0,
    failureTransactionsCount: 0,
    totalAmount: 0,
    totalMerchantsSelected: merchantNamesArray.length,
    paymentType: "cima-machine"
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
    totalMerchantsSelected: merchantNamesArray.length,
    paymentType: "card-connect"
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