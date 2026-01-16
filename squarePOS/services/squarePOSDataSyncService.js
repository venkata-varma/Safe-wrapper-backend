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
const customConstants = require('../../config/constants.json')

const {
    fetchTeamMembers,
    fetchLocations,
    fetchPayments,
    fetchCashDrawerShifts,
    fetchIndividualCashDrawersShift,
    fetchTeamMemberById,
    fetchShiftEvents
} = require('../utils/squarePOSAPIConfiguration');
const { squarePOSExceptionLogs } = require('../utils/sqaurePOSExceptionOperations');





/**
 * Most important super-function that runs sub-functions .  Runs in two places 
 * 1. Manual pull end-point     2. Cron job
 * @param {*}  
 * @returns 
 */
exports.executeSquarePOSDataSync = async ({ accountId, userId, cronId, credentials, dateRanges }) => {

    let exceptionIds = [];
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
    console.log("\x1b[32m%s\x1b[0m", "✔ STEP -1 => Decrypt done ")
    const accessToken = decrypted.access_token;




    /* ----------------------------------------------------
       STEP 2: Initial parallel fetch
    ---------------------------------------------------- */
    const [locations, payments] = await Promise.all([
        // fetchTeamMembers(accessToken),
        fetchLocations(accessToken),
        fetchPayments(accessToken, dateRanges)
    ]);

    console.log("payments===", payments.length)
    console.log("\x1b[32m%s\x1b[0m", " ✔ STEP -2 => Fetching locations and payments done ")





    /* ----------------------------------------------------
       STEP 3: Store Locations (NON-FATAL PER RECORD)  ---Can be put in step -5 itself to avoid another loop. will do it after main work is done
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


        } catch (error) {
            const exceptionId = await squarePOSExceptionLogs({ accountId, userId },
                error?.response?.status || 500,
                error.message,
                "LOCATION_UPSERT_FAILED",
                loc,
                "UPSERT_LOCATION",
                loc.id,
                cronId,
                // referenceId: loc.id,
            )

            exceptionIds.push(exceptionId);
        }
    }


    //Doing STEP 3 (Storing locations in squarePOSLocationsModel)

    console.log("\x1b[32m%s\x1b[0m", " ✔ STEP -3 =>Storing locations in squarePOSLocationsModel) ")

    /* ----------------------------------------------------
       STEP 4: Store Payments
    ---------------------------------------------------- */
    for (const payment of payments) {
        try {
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



        } catch (error) {
            const exceptionId = await squarePOSExceptionLogs(
                { accountId, userId },
                error?.response?.status || 500,
                error.message,
                "PAYMENT_UPSERT_FAILED",
                payment,
                "UPSERT_PAYMENT",
                payment.id,
                cronId
            );
            exceptionIds.push(exceptionId);
        }
    }
    console.log("\x1b[32m%s\x1b[0m", " ✔ STEP -4 => Upserting payments done ")




    /* ------------------------------------------------
      STEP 5: Cash drawer shifts + Employee (NON-FATAL PER LOCATION)
   ------------------------------------------------ */
    const teamMemberCache = new Map();
    for (const loc of locations) {

        let shifts = [];

        try {
            const rawShiftResponse = await fetchCashDrawerShifts(loc.id, accessToken);

            if (Array.isArray(rawShiftResponse) && rawShiftResponse.length > 0) {
                shifts = rawShiftResponse;
            }
            else {
                shifts = sampleCashDrawerShifts?.sampleRecords || [];
            }
        } catch (error) {
            const exceptionId = await squarePOSExceptionLogs({ accountId, userId },
                error?.response?.status || 500,
                error.message,
                "SHIFT_FETCH_FAILED",
                { locationId: loc.id },
                "FETCH_CASH_DRAWER_SHIFTS",
                loc.id,
                cronId
                // responseObject: rawShiftResponse
            )
            exceptionIds.push(exceptionId);
            continue;
        }
        for (const shift of shifts) {
            try {
                const teamMembersResolved = [];

                for (const empId of shift?.employee_ids || []) {
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
                            referenceId: member?.id,
                            payload: { responseObject: member },
                            userId,
                            cronId
                        });
                        teamMemberCache.set(empId, member);
                        teamMembersResolved.push(member);
                    } catch (error) {
                        const exceptionId = await squarePOSExceptionLogs({ accountId, userId },
                            error?.response?.status || 500,
                            error.message,
                            "EMPLOYEE_FETCH_FAILED",
                            { employeeId: empId },
                            "FETCH_TEAM_MEMBER_BY_ID",
                            empId,
                            cronId
                            // referenceId: empId

                        );
                        exceptionIds.push(exceptionId);
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

            } catch (error) {
                const exceptionId = await squarePOSExceptionLogs({ accountId, userId },
                    error?.response?.status || 500,
                    error.message,
                    "SHIFT_PROCESS_FAILED",
                    shift,
                    "UPSERT_CASH_DRAWER_SHIFT",
                    shift.id,
                    cronId
                )
                exceptionIds.push(exceptionId);
            }
        }
    }



    console.log("\x1b[32m%s\x1b[0m", "✔ STEP -5 =>Looping locations - Getting cash drawer shifts - Getting Individual Team member Done. But, need to call individual call of cash drawer shift")



    return {
        message: customConstants.messages.MESSAGE_SQUARE_POS_MANUAL_PULL,
        exceptionIds
    }

}
