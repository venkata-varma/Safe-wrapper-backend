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
  console.log("req.headers", req.headers)
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
