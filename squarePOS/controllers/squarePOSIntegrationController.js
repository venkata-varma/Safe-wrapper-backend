const axios = require('axios');
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../../config/constants.json')
const { squarePOSPredefinedKeys } = require('../config/predefinedKeys')
const squarePOSintegrationssettingsModel = require('../models/squarePOSIntegrationSettingsModel')
const squarePOSMasterCredentialsModel = require('../models/squarePOSCredentialsModel')
const squarePOSPaymentsModel = require('../models/squarePOSPaymentsSchema');
const squarePOSTeamMembersModel = require('../models/squarePOSTeamMembersModel');
const squarePOSLocationsModel = require('../models/squarePOSLocationsModel')
const squarePOSCashDrawerShiftsModel = require('../models/squarePOSCashDrawerShiftsModel')
const { decryptData } = require("../../utils/encryptionAlgorithms")
const squarePOSAPIConfiguration = require("../config/squarePOSConfiguration")
const { fetchTeamMembers, fetchIndividualTeamMember, fetchPayments, fetchLocations, fetchCashDrawerShifts, fetchIndividualCashDrawersShift, fetchShiftEvents } = require('../utils/squarePOSAPIConfiguration');
const squarePOSIntegrationsCronsModel = require('../models/squarePOSIntegrationsCronsModel')
const squarePOSExceptionsModel = require('../models/squarePOSExceptionModel');
const { executeSquarePOSDataSync } = require('../services/squarePOSDataSyncService')
const { generateDateRange, generateDateArray, generateSquareDateRange } = require('../utils/helpers')
const { squarePOSExceptionLogs } = require('../utils/sqaurePOSExceptionOperations');
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
            message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_CREDENTIALS_RECORD_NOT_FOUND,
            data: null
        });
    }

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_MASTER_CREDENTIALS_FETCHED,
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
    let findExistingAccountsSettings = await squarePOSintegrationssettingsModel.findOne({ accountId: req?.body?.accountId })
    if (findExistingAccountsSettings) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_SQUARE_POS_SETTINGS_ALREADY_EXISTS_FOR_ACCOUNT,

        });
    }
    let squarePOSConnectIntegrationsSettings = await squarePOSintegrationssettingsModel.create({
        ...req.body,
        createdBy: req.user._id
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
    const { accountId } = req.params;

    const squarePOSIntegrationMasterSettings =
        await squarePOSintegrationssettingsModel.findOne({ accountId });


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

/**
 * GET Square POS Payment details.
 */
exports.getSquarePOSPayments = asyncWrapper(async (req, res) => {
    const { accountId } = req.params;
    const MasterCredentials = req.validateSquareSetupData.masterCreds;

    /* STEP 1: Get Square POS credentials */
    let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: MasterCredentials.credentials };
    let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));

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

/**
 * Test controller to get all Square POS api details.
 */
exports.syncSquarePOSData = asyncWrapper(async (req, res) => {
    const { accountId } = req.params;
    const userId = req.user._id;

    const masterCreds = await squarePOSMasterCredentialsModel.findOne({ accountId, source: 'square-pos' });
    const integrationSettings = await squarePOSintegrationssettingsModel.findOne({ accountId });
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

    // 1. Get & Decrypt Credentials

    const decrypted = JSON.parse(await decryptData({
        iv: process.env.CRYPTO_IV,
        encryptedData: masterCreds.credentials
    }, process.env.CRYPTO_KEY));

    const accessToken = decrypted.access_token;

    // 2. Initial Fetch: Teams, Locations, Payments
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
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_SQUARE_POS_MANUAL_PULL,
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

/**
 * Responsible for one of important end-points --->    "/manual-sync/:accountId"
 * Initiates record in crons model with type as "manual"
 * Contains a super-funciton called "executeSquarePOSDataSync" which contains other sub-functions
 * If whole flow is successful, updates the respective cron-job as "completed". Otherwise, as "failed"
 */
exports.manualPullDataDump = asyncWrapper(async (req, res) => {
    const { accountId } = req.params;
    const userId = req.user._id;
    const IntegrationSettings = req.validateSquareSetupData.integrationSettings;
    const MasterCredentials = req.validateSquareSetupData.masterCreds;

    const dataDumpRange = IntegrationSettings.dataDumpRange || 20;

    let dateRanges = generateSquareDateRange(dataDumpRange)
    console.log("dateRanges==", dateRanges)

    /* ----------------------------------------------------
      STEP 1: Create Cron Log (OUTSIDE try/catch)
      🔥 Cron ID must exist even if sync fails
   ---------------------------------------------------- */

    const cronLog = await squarePOSIntegrationsCronsModel.create({
        accountId,
        userId,
        status: "initiated",
        cronJobType: "manual",

    });

    /* ----------------------------------------------------
STEP 2: Update Integration Settings with last pull info
---------------------------------------------------- */
    await squarePOSintegrationssettingsModel.findOneAndUpdate(
        { accountId },
        {
            $set: {
                lastPullDate: new Date(),
                lastIntegrationsCronId: cronLog._id
            }
        },
        { new: true, runValidators: true }
    );

    /* ----------------------------------------------------
       STEP 3: Execute Square POS Sync
    ---------------------------------------------------- */
    try {

        await executeSquarePOSDataSync({
            accountId,
            userId,
            cronId: cronLog._id,
            credentials: MasterCredentials,
            dateRanges
        });

        const finalCronDetails = await squarePOSIntegrationsCronsModel.findByIdAndUpdate(
            cronLog._id,
            { $set: { status: "completed" } },
            { new: true, runValidators: true }
        );

        const exceptionsCount = await squarePOSExceptionsModel.countDocuments({
            squarePOSIntegrationsCronId: cronLog._id
        });

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_SQUARE_POS_MANUAL_PULL,
            // message: 'Manual data sync using dump range completed successfully',
            data: {
                finalResult: {
                    accountId: finalCronDetails.accountId,
                    cronId: finalCronDetails._id,
                    cronJobType: finalCronDetails.cronJobType,
                    exceptionsCount,

                }
            }
        })

    } catch (Error) {
        /* ----------------------------------------------------
     STEP 5: Mark Cron as FAILED
     No rethrow — controller owns response
  ---------------------------------------------------- */
        const finalCronDetails = await squarePOSIntegrationsCronsModel.findByIdAndUpdate(
            cronLog._id,
            { $set: { status: "failed" } },
            { new: true }
        );
        const exceptionsCount = await squarePOSExceptionsModel.countDocuments({
            squarePOSIntegrationsCronId: cronLog._id
        });

        return res.status(customConstants.statusCodes.UNHANDLED_EXCEPTION).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_SQUARE_POS_MANUAL_PULL_FAILED,
            data: {
                finalResult: {
                    accountId: finalCronDetails.accountId,
                    cronId: finalCronDetails._id,
                    cronStatus: finalCronDetails.status,
                    cronJobType: finalCronDetails.cronJobType,
                    exceptionsCount,

                }
            }
        });





    }

});






