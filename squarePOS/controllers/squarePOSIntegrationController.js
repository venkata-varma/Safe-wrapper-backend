const axios = require('axios');
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../../config/constants.json')
const { squarePOSPredefinedKeys } = require('../config/predefinedKeys')
const squarePOSintegrationssettingsModel = require('../models/squarePOSIntegrationSettings')
const squarePOSMasterCredentialsModel = require('../models/squarePOSCredentialsModel')
const squarePOSPaymentsModel = require('../models/squarePOSPaymentsSchema');
const squarePOSTeamMembersModel = require('../models/squarePOSTeamMembersModel');
const squarePOSLocationsModel = require('../models/squarePOSLocationsModel')
const { decryptData } = require("../../utils/encryptionAlgorithms")
const squarePOSAPIConfiguration = require("../config/squarePOSConfiguration")

/**
 * Helper to validate credentials against the Square API
 */
exports.validateSquarePOSCredentails = asyncWrapper(async (payload) => {
    const { accessToken } = payload.credentials;
    console.log('accessToken:', accessToken);
    const response = await axios.get('https://connect.squareupsandbox.com/v2/merchants', {
        headers: {
            'Square-Version': '2024-12-18',
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    const merchants = response?.data?.merchant;
    console.log('merchants:', merchants);

    if (!merchants || merchants.length === 0) {
        return {
            status: customConstants.messages.MESSAGE_FAIL,
            statusCode: customConstants.statusCodes.UNAUTHORIZED,
            message: customConstants.messages.MESSAGE_AUTHENTICATION_FAILURE
        };
    }
    return {
        status: customConstants.messages.MESSAGE_SUCCESS,
        statusCode: customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS,
        data: merchants[0]

    };

})

exports.getSquarePOSIntegrationMasterCredentials = asyncWrapper(async (req, res) => {
    const { accountId } = req.params;

    const squarePOSMasterCredentials = await squarePOSMasterCredentialsModel.findOne({ accountId: accountId, source: 'square-pos' });

    if (!squarePOSMasterCredentials) {
        return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: "No master credentials found",
            data: null
        });
    }

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: "Master credentials fetched successfully",
        data: {
            squarePOSMasterCredentials
        }
    });
}
)

/**
 * Front-end screen exists for giving values to settings for square pos integration.
 */
exports.createSquarePOSIntegrationMasterSettings = asyncWrapper(async (req, res) => {

    let squarePOSConnectIntegrationsSettings = await squarePOSintegrationssettingsModel.create({
        ...req.body,
        createdBy: req.user._id,
        // transactionStatusKeys: squarePOSPredefinedKeys.transactionStatusKeys,
        // transactionTypeKeys: squarePOSPredefinedKeys.transactionTypeKeys,
        // requiredDatapoints: squarePOSPredefinedKeys.requiredDatapoints,
        // customerObjectKeys: squarePOSPredefinedKeys.customerObjectKeys   //Not useful as of now
    });


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_INTEGRATIONS_SETTINGS,
            data: {
                squarePOSIntegrationsSettings: squarePOSConnectIntegrationsSettings
            },
        });

})

/**
 * GET Integration Master Settings Details.
 */
exports.getIntegrationMasterSettings = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    console.log(req.params, ":req.params")
    console.log(id, ":squarePOSIntegrationsSettingId")

    const squarePOSIntegrationMasterSettings =
        await squarePOSintegrationssettingsModel.findOne({ squarePOSIntegrationsSettingId: id });

    console.log(squarePOSIntegrationMasterSettings, ":squarePOSIntegrationMasterSettings")
    if (!squarePOSIntegrationMasterSettings) {
        return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_NO_MASTER_SETTINGS_FOUND,
            data: null
        });
    }

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_MASTER_SETTINGS_FETCHED_SUCCESSFULLY,
        data: {
            squarePOSIntegrationMasterSettings
        }
    });
});

exports.getSquarePOSPayments = asyncWrapper(async (req, res) => {
    const { accountId } = req.params;
    console.log(accountId, ":accountId")
    /* STEP 1: Get Square POS credentials */

    const squarePOSMasterCredentials = await squarePOSMasterCredentialsModel.findOne({ accountId: accountId, source: 'square-pos' });

    console.log(squarePOSMasterCredentials, ":squarePOSMasterCredentials")
    if (!squarePOSMasterCredentials) {
        return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: 'No master credentials found',
            data: null
        });
    }

    let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: squarePOSMasterCredentials.credentials };
    let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));

    /* STEP 2: Get integration master settings */
    const integrationSettings =
        await squarePOSintegrationssettingsModel.findOne({ accountId });
    console.log(integrationSettings, ":integrationSettings")
    if (!integrationSettings) {
        return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_NO_MASTER_SETTINGS_FOUND,
            data: null
        });
    }
    /* STEP 4: Call Square Payments API */
    const squarePaymentsResponse = await axios({
        method: 'GET',
        url: squarePOSAPIConfiguration.SquarePOS?.getPayments?.url,
        headers: {
            Authorization: `Bearer ${decryptConfigCredentials.access_token}`,
            'Square-Version': '2024-12-18',
            'Content-Type': 'application/json'
        }
    });

    const payments = squarePaymentsResponse?.data?.payments || [];

    /* STEP 5: Save payments */
    for (const payment of payments) {
        await squarePOSPaymentsModel.updateOne(
            { referenceId: payment.id },
            {
                $set: {
                    accountId,
                    referenceId: payment.id,
                    referenceStatus: payment.status,
                    responseObject: payment,
                    createdBy: req.user._id
                }
            },
            { upsert: true }
        );
    }

    /* STEP 6: Response */
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_PAYMENTS_FETCHED_SUCCESSFULLY,
        data: {
            totalPayments: payments.length,
            payments: payments.map(payment => ({
                id: payment.id,
                sourceType: payment.source_type,
                status: payment.status,
                locationId: payment.location_id
            }))
        }
    });
});

/* --- Helper Functions --- */

async function fetchTeamMembers(accessToken) {
    const url = squarePOSAPIConfiguration?.SquarePOS?.teamMembersList?.url;
    if (!url) return [];

    // Square Team API requires a POST to /search to list members
    const { data } = await axios.post(url, {}, {
        headers: getSquareHeaders(accessToken)
    });

    return data?.team_members || [];
}

async function fetchPayments(accessToken) {
    const url = squarePOSAPIConfiguration?.SquarePOS?.getPayments?.url;
    if (!url) return [];
    const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
    return data?.payments || [];
}

async function fetchLocations(accessToken) {
    const url = squarePOSAPIConfiguration?.SquarePOS?.getLocations?.url;
    if (!url) return [];
    const { data } = await axios.get(url, { headers: getSquareHeaders(accessToken) });
    return data?.locations || [];
}

function getSquareHeaders(accessToken) {
    return {
        Authorization: `Bearer ${accessToken}`,
        'Square-Version': '2024-12-18',
        'Content-Type': 'application/json'
    };
}

/* --- Main Controller --- */

exports.syncSquarePOSData = asyncWrapper(async (req, res) => {
    const { accountId } = req.params;
    const userId = req.user._id;

    // 1. Get & Decrypt Credentials
    const masterCreds = await squarePOSMasterCredentialsModel.findOne({ accountId, source: 'square-pos' });
    if (!masterCreds) {
        return res.status(customConstants.statusCodes.ERROR_STATUS_CODE_NOT_FOUND).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: 'Square POS credentials not found',
            data: null
        });
    }

    const decrypted = JSON.parse(await decryptData({
        iv: process.env.CRYPTO_IV,
        encryptedData: masterCreds.credentials
    }, process.env.CRYPTO_KEY));

    const accessToken = decrypted.access_token;

    // 2. Fetch Data from Square in Parallel
    const [teamMembers, locations, payments] = await Promise.all([
        fetchTeamMembers(accessToken),
        fetchLocations(accessToken),
        fetchPayments(accessToken)
    ]);

    // 3. Save / Update Data in Database
    const saveTasks = [
        // Update Team Members
        ...teamMembers.map(member => squarePOSTeamMembersModel.updateOne(
            { referenceId: member.id },
            { $set: { accountId, referenceId: member.id, responseObject: member, createdBy: userId } },
            { upsert: true }
        )),
        // Update Locations
        ...locations.map(loc => squarePOSLocationsModel.updateOne(
            { referenceId: loc.id },
            { $set: { accountId, referenceId: loc.id, responseObject: loc, createdBy: userId } },
            { upsert: true }
        )),
        // Update Payments
        ...payments.map(payment => squarePOSPaymentsModel.updateOne(
            { referenceId: payment.id },
            { $set: { accountId, referenceId: payment.id, referenceStatus: payment.status, responseObject: payment, createdBy: userId } },
            { upsert: true }
        ))
    ];

    await Promise.all(saveTasks);

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: "Square POS sync completed successfully",
        data: {
            paymentsCount: payments.length,
            teamMembersCount: teamMembers.length,
            locationsCount: locations.length
        }
    });
});