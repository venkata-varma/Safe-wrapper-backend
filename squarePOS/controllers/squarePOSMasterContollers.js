
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../../config/constants.json');
const accountsModel = require('../../models/accountsModel');
const squarePOSCredentialsModel = require('../models/squarePOSCredentialsModel');
const { validateServiceProviders } = require('../utils/credentialsValidation');
const { encryptData } = require("../../utils/encryptionAlgorithms")
const squarePOSAPIConfiguration = require("../config/squarePOSConfiguration")
const squarePOSintegrationssettingsModel = require('../models/squarePOSIntegrationSettingsModel');
const squarePOSIntegrationsCronsModel = require('../models/squarePOSIntegrationsCronsModel');
const squarePOSExceptionModel = require('../models/squarePOSExceptionModel');

/**
 * Middleware for Validating existence of "accountId" in payload (body)
 * If validation is passed, then function call is passed to next immediate function of respective end-point
 */
exports.validateAccountExistAndActive = asyncWrapper(async (req, res, next) => {
    const accountId = req.body.accountId || req.params.accountId;

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
 * Middleware for validation of Square POS credentials entered by user.
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
    // console.log("credentialsValidation===", credentialsValidation)

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
 * Middleware for Validating existence of "accountId" in Square POS Master Credentials & Integration Settings collection
 */
exports.validateSquareSetup = asyncWrapper(async (req, res, next) => {
    // 1. Extract accountId from either params or body
    const accountId = req.params.accountId || req.body.accountId;

    // 2. Fetch both records in parallel for performance
    const [masterCreds, integrationSettings] = await Promise.all([
        squarePOSCredentialsModel.findOne({ accountId, source: 'square-pos' }),
        squarePOSintegrationssettingsModel.findOne({ accountId })
    ]);

    // 3. Validation Checks
    if (!masterCreds) {
        return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_CREDENTIALS_RECORD_NOT_FOUND,
            data: null
        });
    }

    if (!integrationSettings) {
        return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_NO_MASTER_SETTINGS_FOUND,
            data: null
        });
    }

    req.validateSquareSetupData = {
        masterCreds,
        integrationSettings
    };

    next();
});

/**
 * Function call will be passed to this function only if middleware function called "credentialsValidationsMiddleware" is passed & successful. 
 * 
 */
exports.createIntegrationMasterCredentials = asyncWrapper(async (req, res, next) => {
    const { payload, squareData } = req;
    const merchant = squareData?.merchant?.[0];

    let findExistingAccountsCredentials = await squarePOSCredentialsModel.findOne({ accountId: payload?.accountId })
    if (findExistingAccountsCredentials) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_SQUARE_POS_AUTHENTICATION_ALREADY_EXISTS_FOR_ACCOUNT,

        });
    }
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

    let savedCredentials = await squarePOSCredentialsModel.create(prepareReqObj);

    return res.status(200).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATION_CREDENTIALS_SAVED,
        data: {
            squarePOSMasterCredentials: savedCredentials
        }
    });
});

exports.UpdateIntegrationMasterCredentials = asyncWrapper(async (req, res, next) => {
    const { payload, squareData } = req;
    const merchant = squareData?.merchant?.[0];
    const accountIdFromBody = req.body.accountId;
    const credentialsId = req.params.credentialsId;

    const existingCredentials = await squarePOSCredentialsModel.findById(credentialsId);

    if (!existingCredentials) {
        return res.status(404).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_CREDENTIALS_RECORD_NOT_FOUND,
        });
    }
    if (existingCredentials.accountId.toString() !== accountIdFromBody) {
        return res.status(400).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNTID_MISMATCH_TO_UPDATE_CREDENTIALS,
        });
    }

    const updateData = {
        ...payload,
        accountId: accountIdFromBody,
        source: 'square-pos',
        credentials: encryptData({ access_token: payload?.credentials?.accessToken }),
        primaryKeyValues: {
            merchantId: merchant?.id,
            businessName: merchant?.business_name
        },
        status: "verified",
        updatedBy: req.user?._id,
    };

    let savedCredentials = await squarePOSCredentialsModel.findByIdAndUpdate(
        credentialsId,
        updateData,
        { new: true }
    );

    return res.status(200).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATION_CREDENTIALS_UPDATED,
        data: {
            squarePOSMasterCredentials: savedCredentials
        }
    });
});



/**
 * 
 */
exports.updateIntegrationMasterSettings = asyncWrapper(async (req, res) => {
    const { integrationSettingsId } = req.params;

    const updatedSettings = await squarePOSintegrationssettingsModel.findOneAndUpdate(
        { squarePOSIntegrationsSettingId: integrationSettingsId },
        { $set: req.body },
        { new: true }
    );

    if (!updatedSettings) {
        return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_NO_MASTER_SETTINGS_FOUND,
            data: null
        });
    }

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATION_UPDATED,
        data: {
            squarePOSIntegrationMasterSettings: updatedSettings
        }
    });
})

exports.getDetailsOfCronJobId = asyncWrapper(async (req, res) => {
    const { cronJobId, accountId } = req.params;

    const [cronJobDetails, exceptions] = await Promise.all([
        squarePOSIntegrationsCronsModel.findById(cronJobId),
        squarePOSExceptionModel
            .find({ squarePOSIntegrationsCronId: new mongoose.Types.ObjectId(cronJobId) })
            .sort({ createdAt: -1 })
    ]);

    if (!cronJobDetails) {
        return res.status(404).json({
            status: 'fail',
            message: 'Cron job not found'
        });
    }

    // Enrich response with readable counts
    const enrichedCronDetails = {
        ...cronJobDetails._doc,
        totalFetchedTransactionsCount: cronJobDetails.pulledCount || 0,
        newlyAddedTransactionsCount: cronJobDetails.pushedCount || 0,
        updatedTransactionsCount: cronJobDetails.updatedCount || 0,
        exceptionsCount: exceptions.length
    };

    // Clean up original count fields (optional)
    delete enrichedCronDetails.pulledCount;
    delete enrichedCronDetails.pushedCount;
    delete enrichedCronDetails.updatedCount;

    return res.status(200).json({
        status: 'success',
        message: 'Cron job details retrieved successfully',
        data: {
            cronDetails: enrichedCronDetails,
            exceptions
        }
    });
});
