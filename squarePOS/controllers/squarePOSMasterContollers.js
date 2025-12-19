
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../../config/constants.json');
const accountsModel = require('../../models/accountsModel');
const squarePOSCredentialsModel = require('../models/squarePOSCredentialsModel');
const { validateServiceProviders } = require('../utils/credentialsValidation');
const { encryptData } = require("../../utils/encryptionAlgorithms")
const squarePOSAPIConfiguration = require("../config/squarePOSConfiguration")
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
 * Middleware for validation of Square POS credentials entered by customer.
 * Values for few keys such as "authorizationType", etc; are hard-coded as said.
 * If credentials are not valid, Error will be thrown. Else, will be stored in Square POS credentials model
 */
exports.credentialsValidationsMiddleware = asyncWrapper(async (req, res, next) => {
    let payload;

    if (req.body.source === 'square-pos') {
        payload = {
            accountId: req.body.accountId,
            userId: req.body.userId,
            source: req.body.source,
            authorizationType: "Bearer", // Square uses Bearer
            authenticationKey: "Authorization",
            credentials: {
                accessToken: req.body.accessToken,
                baseUrl: squarePOSAPIConfiguration?.SquarePOS?.authUrl?.url,
                serviceMethod: 'GET',
                headers: {
                    'Square-Version': '2024-12-18',
                    'Content-Type': 'application/json'
                }
            }
        };
    }

    // Call the generic validatorcredentialsValidation
    let credentialsValidation = await validateServiceProviders(payload);
    console.log("credentialsValidation===", credentialsValidation)

    if (credentialsValidation.status === "fail" || !credentialsValidation || credentialsValidation.statusCode !== customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS) {
        return res.status(credentialsValidation?.statusCode || 401).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE,
            data: credentialsValidation?.data
        });
    }

    // Attach the validated data and original payload to the request
    req.payload = payload;
    req.squareData = credentialsValidation.responseData; // Store merchant info
    next();
});
/**
 * Function call will be passed to this function only if middleware function called "credentialsValidationsMiddleware" is passed & successful. 
 * 
 */
exports.createIntegrationMasterCredentials = asyncWrapper(async (req, res, next) => {
    const { payload, squareData } = req;
    const merchant = squareData?.merchant?.[0];

    // 1. Prepare data for the Master Credentials table
    let prepareReqObj = {
        ...payload,
        credentials: encryptData({ access_token: payload?.credentials?.accessToken }),
        primaryKeyValues: {
            merchantId: merchant?.id,
            businessName: merchant?.business_name
        },
        status: "verified",
        createdBy: req.user?._id,
    };
    console.log("prepareReqObj===", prepareReqObj)
    let savedCredentials = await squarePOSCredentialsModel.create(prepareReqObj);
    console.log("Saved Credentials: ", savedCredentials);

    return res.status(200).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATION_CREDENTIALS_SAVED,
        data: {
            squarePOSIntegrationsMasterCredentials: savedCredentials
        }
    });
});