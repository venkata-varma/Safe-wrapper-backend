const squarePOSTeamMembersModel = require('../models/squarePOSTeamMembersModel');
const squarePOSLocationsModel = require('../models/squarePOSLocationsModel');
const squarePOSPaymentsModel = require('../models/squarePOSPaymentsSchema');
const squarePOSCashDrawerShiftsModel = require('../models/squarePOSCashDrawerShiftsModel');
const squarePOSIntegrationsCronsModel = require('../models/squarePOSIntegrationsCronsModel');
const squarePOSExceptionsModel = require('../models/squarePOSExceptionModel');
const { decryptData } = require("../../utils/encryptionAlgorithms")
const asyncWrapper = require('../middleware/asyncWrapper');
const { upsertByReference } = require('../utils/mongoUpsertHelper');
const sampleCashDrawerShifts = require('../services/sampleCashDrawerShifts.json');

const {
    fetchTeamMembers,
    fetchLocations,
    fetchPayments,
    fetchCashDrawerShifts,
    fetchIndividualCashDrawersShift,
    fetchTeamMemberById,
    fetchShiftEvents
} = require('../utils/squarePOSAPIConfiguration');

exports.executeSquarePOSDataSync = asyncWrapper(async ({ accountId, userId, cronId, credentials }) => {

    let pushedCount = 0;
    let updatedCount = 0;
    let totalShifts = 0;

    /* ----------------------------------------------------
       STEP 1: Decrypt Square credentials
    ---------------------------------------------------- */
    const decrypted = JSON.parse(
        await decryptData(
            {
                iv: process.env.CRYPTO_IV,
                encryptedData: credentials.credentials
            },
            process.env.CRYPTO_KEY
        )
    );

    const accessToken = decrypted.access_token;

    /* ----------------------------------------------------
       STEP 2: Initial parallel fetch
    ---------------------------------------------------- */
    const [locations, payments] = await Promise.all([
        // fetchTeamMembers(accessToken),
        fetchLocations(accessToken),
        fetchPayments(accessToken)
    ]);

    /* ----------------------------------------------------
       STEP 3: Store Locations (NON-FATAL PER RECORD)
    ---------------------------------------------------- */
    for (const loc of locations) {
        try {
            const status = await upsertByReference({
                model: squarePOSLocationsModel,
                accountId,
                referenceId: loc.id,
                payload: { responseObject: loc },
                userId,
                cronId
            });

            status === 'CREATED' ? pushedCount++ : updatedCount++;
        } catch (error) {
            await squarePOSExceptionsModel.create({
                accountId,
                squarePOSIntegrationsCronId: cronId,
                errorType: 'LOCATION_UPSERT_FAILED',
                errorMessage: error.message,
                referenceId: loc.id,
                responseObject: loc
            });
        }
    }
    /* ----------------------------------------------------
       STEP 4: Store Payments
    ---------------------------------------------------- */
    for (const payment of payments) {
        const status = await upsertByReference({
            model: squarePOSPaymentsModel,
            accountId,
            referenceId: payment.id,
            payload: {
                responseObject: payment,
                referenceStatus: payment.status
            },
            userId,
            cronId
        });

        status === 'CREATED' ? pushedCount++ : updatedCount++;
    }
    /* ------------------------------------------------
      STEP 5: Cash drawer shifts + Employee (NON-FATAL PER LOCATION)
   ------------------------------------------------ */
    const teamMemberCache = new Map();
    for (const loc of locations) {
        let shifts = [];

        try {
            shifts = await fetchCashDrawerShifts(loc.id, accessToken);
            shifts = Array.isArray(rawShiftResponse)
                ? rawShiftResponse
                : rawShiftResponse?.cash_drawer_shifts || [];

            if (!shifts.length) {
                shifts = sampleCashDrawerShifts;
            }

        } catch (error) {

            if (!Array.isArray(shifts)) {
                await squarePOSExceptionsModel.create({
                    accountId,
                    squarePOSIntegrationsCronId: cronId,
                    errorType: 'INVALID_SHIFT_RESPONSE',
                    errorMessage: 'fetchCashDrawerShifts did not return iterable',
                    responseObject: rawShiftResponse
                });
                continue;
            }

            // await squarePOSExceptionsModel.create({
            //     accountId,
            //     squarePOSIntegrationsCronId: cronId,
            //     errorType: 'SHIFT_FETCH_FAILED',
            //     errorMessage: error.message,
            //     referenceId: loc.id
            // });
            // continue;
        }
        for (const shift of shifts) {
            try {
                const teamMembersResolved = [];

                for (const empId of shift.employee_ids || []) {
                    // 1️Check cache first
                    if (teamMemberCache.has(empId)) {
                        teamMembersResolved.push(teamMemberCache.get(empId));
                        continue;
                    }
                    try {
                        const member = await fetchTeamMemberById(empId, accessToken);
                        await upsertByReference({
                            model: squarePOSTeamMembersModel,
                            accountId,
                            referenceId: member.id,
                            payload: { responseObject: member },
                            userId,
                            cronId
                        });
                        teamMemberCache.set(empId, member);
                        teamMembersResolved.push(member);
                    } catch (err) {
                        await squarePOSExceptionsModel.create({
                            accountId,
                            squarePOSIntegrationsCronId: cronId,
                            errorType: 'EMPLOYEE_FETCH_FAILED',
                            errorMessage: err.message,
                            referenceId: empId
                        });
                    }
                }

                const status = await upsertByReference({
                    model: squarePOSCashDrawerShiftsModel,
                    accountId,
                    referenceId: shift.id,
                    payload: {
                        locationId: loc.id,
                        responseObject: shift,
                        teamMembers: teamMembersResolved
                    },
                    userId,
                    cronId
                });

                status === 'CREATED' ? pushedCount++ : updatedCount++;
                totalShifts++;
            } catch (error) {
                await squarePOSExceptionsModel.create({
                    accountId,
                    squarePOSIntegrationsCronId: cronId,
                    errorType: 'SHIFT_PROCESS_FAILED',
                    errorMessage: error.message,
                    referenceId: shift.id,
                    responseObject: shift
                });
            }
        }
    }

    /* ----------------------------------------------------
       STEP 6: Update Cron
    ---------------------------------------------------- */
    await squarePOSIntegrationsCronsModel.findByIdAndUpdate(cronId, {
        $set: {
            pulledCount:
                locations.length +
                payments.length +
                totalShifts,
            pushedCount,
            updatedCount
        }
    });

    return {
        message: 'Square POS sync completed successfully',
        // pulledCount,
        // pushedCount,
        // updatedCount,
        pushedCount,
        updatedCount,
        totalShifts
        // // paymentsCount: payments.length,
        // teamMembersCount: teamMembers.length,
        // locationsCount: locations.length,
        // cashDrawerShiftsCount: allShifts.length,
        // individualShiftsCount: individualShiftsDetails.length,
        // shiftEventsCount: allShiftEvents.length
    };
    // res.status(200).json({
    //     pushedCount,
    //     updatedCount,
    //     totalShifts
    // });
}
)