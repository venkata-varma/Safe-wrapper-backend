const axios = require('axios');
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../../config/constants.json')
const { squarePOSPredefinedKeys } = require('../config/predefinedKeys')
const squarePOSintegrationssettingsModel = require('../models/squarePOSIntegrationSettings')
const squarePOSMasterCredentialsModel = require('../models/squarePOSCredentialsModel')
const squarePOSPaymentsModel = require('../models/squarePOSPaymentsSchema');
const squarePOSTeamMembersModel = require('../models/squarePOSTeamMembersModel');
const squarePOSLocationsModel = require('../models/squarePOSLocationsModel')
const squarePOSCashDrawerShiftsModel = require('../models/squarePOSCashDrawerShiftsModel')
const { decryptData } = require("../../utils/encryptionAlgorithms")
const squarePOSAPIConfiguration = require("../config/squarePOSConfiguration")
const { fetchTeamMembers, fetchIndividualTeamMember, fetchPayments, fetchLocations, fetchCashDrawerShifts, fetchIndividualCashDrawersShift, fetchShiftEvents } = require('../utils/squarePOSAPIConfiguration');

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
    console.log("Decrypted Access Token:", accessToken);

    // 2. Initial Fetch: Teams, Locations, Payments
    console.log("Starting Initial Fetch...");
    const [teamMembers, locations, payments] = await Promise.all([
        fetchTeamMembers(accessToken),
        fetchLocations(accessToken),
        fetchPayments(accessToken)
    ]);

    // 3. Sequential Fetch: Shifts -> Individual Details -> Events
    let allShifts = [];
    let individualShiftsDetails = [];
    let allShiftEvents = [];

    for (const loc of locations) {
        console.log("Processing shifts for location ID:", loc.id);
        const shifts = await fetchCashDrawerShifts(loc.id, accessToken);

        for (const shift of shifts) {
            // Fetch Individual Shift Detail
            // Note: Replace with your actual helper name if different (e.g. fetchIndividualShift)
            const detail = await fetchIndividualCashDrawersShift(shift.id, accessToken);
            if (detail) individualShiftsDetails.push(detail);

            // Fetch Shift Events
            const events = await fetchShiftEvents(shift.id, accessToken);
            if (events.length > 0) {
                allShiftEvents.push(...events.map(ev => ({ ...ev, shiftId: shift.id })));
            }

            allShifts.push({ ...shift, locationId: loc.id });
        }
    }

    // 4. Save Tasks
    // I am including the logic to save Shifts. 
    // Add additional logic here if you have models for Individual Details or Events.
    const saveTasks = [
        ...teamMembers.map(member => squarePOSTeamMembersModel.updateOne(
            { referenceId: member.id, accountId },
            { $set: { accountId, referenceId: member.id, responseObject: member, createdBy: userId } },
            { upsert: true }
        )),
        ...locations.map(loc => squarePOSLocationsModel.updateOne(
            { referenceId: loc.id, accountId },
            { $set: { accountId, referenceId: loc.id, responseObject: loc, createdBy: userId } },
            { upsert: true }
        )),
        ...payments.map(payment => squarePOSPaymentsModel.updateOne(
            { referenceId: payment.id, accountId },
            { $set: { accountId, referenceId: payment.id, referenceStatus: payment.status, responseObject: payment, createdBy: userId } },
            { upsert: true }
        )),
        ...allShifts.map(shift => squarePOSCashDrawerShiftsModel.updateOne(
            { referenceId: shift.id, accountId },
            { $set: { accountId, locationId: shift.locationId, referenceId: shift.id, responseObject: shift, createdBy: userId } },
            { upsert: true }
        ))
    ];

    await Promise.all(saveTasks);

    // 5. Response with required counts
    return res.status(200).json({
        status: "success",
        message: "Square POS full sync completed",
        data: {
            paymentsCount: payments.length,
            teamMembersCount: teamMembers.length,
            locationsCount: locations.length,
            cashDrawerShiftsCount: allShifts.length,
            IndividualCashDrawersShift: individualShiftsDetails.length,
            CashDrawersShiftsEvents: allShiftEvents.length
        }
    });
});