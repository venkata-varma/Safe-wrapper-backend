const squarePOSTeamMembersModel = require('../models/squarePOSTeamMembersModel');
const squarePOSLocationsModel = require('../models/squarePOSLocationsModel');
const squarePOSPaymentsModel = require('../models/squarePOSPaymentsSchema');
const squarePOSCashDrawerShiftsModel = require('../models/squarePOSCashDrawerShiftsModel');
const squarePOSIntegrationsCronsModel = require('../models/squarePOSIntegrationsCronsModel');
const squarePOSExceptionsModel = require('../models/squarePOSExceptionModel');
const { decryptData } = require("../../utils/encryptionAlgorithms")

const {
    fetchTeamMembers,
    fetchLocations,
    fetchPayments,
    fetchCashDrawerShifts,
    fetchIndividualCashDrawersShift,
    fetchShiftEvents
} = require('../utils/squarePOSAPIConfiguration');

exports.executeSquarePOSDataSync = async ({ accountId, userId, cronId, credentials }) => {
    try {
        // 1. Decrypt credentials
        const decrypted = JSON.parse(await decryptData({
            iv: process.env.CRYPTO_IV,
            encryptedData: credentials.credentials
        }, process.env.CRYPTO_KEY));

        const accessToken = decrypted.access_token;
        console.log("Starting Square POS data sync for account:", accountId);

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
            console.log("Processing shifts for location ID:", loc.id);

            try {
                const shifts = await fetchCashDrawerShifts(loc.id, accessToken);

                for (const shift of shifts) {
                    try {
                        // Fetch Individual Shift Detail
                        const detail = await fetchIndividualCashDrawersShift(shift.id, accessToken);
                        if (detail) individualShiftsDetails.push(detail);

                        // Fetch Shift Events
                        const events = await fetchShiftEvents(shift.id, accessToken);
                        if (events.length > 0) {
                            allShiftEvents.push(...events.map(ev => ({ ...ev, shiftId: shift.id })));
                        }

                        allShifts.push({ ...shift, locationId: loc.id });
                    } catch (shiftError) {
                        console.error(`Error processing shift ${shift.id}:`, shiftError);

                        // Log exception
                        await squarePOSExceptionsModel.create({
                            accountId,
                            squarePOSIntegrationsCronId: cronId,
                            errorType: 'shift_processing_error',
                            errorMessage: shiftError.message,
                            referenceId: shift.id,
                            responseObject: shift
                        });
                    }
                }
            } catch (locationError) {
                console.error(`Error processing location ${loc.id}:`, locationError);

                // Log exception
                await squarePOSExceptionsModel.create({
                    accountId,
                    squarePOSIntegrationsCronId: cronId,
                    errorType: 'location_processing_error',
                    errorMessage: locationError.message,
                    referenceId: loc.id,
                    responseObject: loc
                });
            }
        }

        // 4. Save Tasks with upsert logic
        const saveTasks = [];
        let pushedCount = 0;
        let updatedCount = 0;

        // Team Members
        for (const member of teamMembers) {
            const result = await squarePOSTeamMembersModel.updateOne(
                { referenceId: member.id, accountId },
                {
                    $set: {
                        accountId,
                        referenceId: member.id,
                        responseObject: member,
                        updatedBy: userId,
                        squarePOSIntegrationsCronIdUpdate: cronId
                    },
                    $setOnInsert: {
                        createdBy: userId,
                        squarePOSIntegrationsCronIdCreate: cronId
                    }
                },
                { upsert: true }
            );

            if (result.upsertedCount) pushedCount++;
            else if (result.modifiedCount) updatedCount++;
        }

        // Locations
        for (const loc of locations) {
            const result = await squarePOSLocationsModel.updateOne(
                { referenceId: loc.id, accountId },
                {
                    $set: {
                        accountId,
                        referenceId: loc.id,
                        responseObject: loc,
                        updatedBy: userId,
                        squarePOSIntegrationsCronIdUpdate: cronId
                    },
                    $setOnInsert: {
                        createdBy: userId,
                        squarePOSIntegrationsCronIdCreate: cronId
                    }
                },
                { upsert: true }
            );

            if (result.upsertedCount) pushedCount++;
            else if (result.modifiedCount) updatedCount++;
        }

        // Payments
        for (const payment of payments) {
            const result = await squarePOSPaymentsModel.updateOne(
                { referenceId: payment.id, accountId },
                {
                    $set: {
                        accountId,
                        referenceId: payment.id,
                        referenceStatus: payment.status,
                        responseObject: payment,
                        updatedBy: userId,
                        squarePOSIntegrationsCronIdUpdate: cronId
                    },
                    $setOnInsert: {
                        createdBy: userId,
                        squarePOSIntegrationsCronIdCreate: cronId
                    }
                },
                { upsert: true }
            );

            if (result.upsertedCount) pushedCount++;
            else if (result.modifiedCount) updatedCount++;
        }

        // Cash Drawer Shifts
        for (const shift of allShifts) {
            const result = await squarePOSCashDrawerShiftsModel.updateOne(
                { referenceId: shift.id, accountId },
                {
                    $set: {
                        accountId,
                        locationId: shift.locationId,
                        referenceId: shift.id,
                        responseObject: shift,
                        updatedBy: userId,
                        squarePOSIntegrationsCronIdUpdate: cronId
                    },
                    $setOnInsert: {
                        createdBy: userId,
                        squarePOSIntegrationsCronIdCreate: cronId
                    }
                },
                { upsert: true }
            );

            if (result.upsertedCount) pushedCount++;
            else if (result.modifiedCount) updatedCount++;
        }

        // 5. Update cron with counts
        const pulledCount = teamMembers.length + locations.length + payments.length + allShifts.length;

        await squarePOSIntegrationsCronsModel.findByIdAndUpdate(
            cronId,
            {
                $set: {
                    pulledCount,
                    pushedCount,
                    updatedCount
                }
            }
        );

        console.log('Square POS sync completed successfully');

        return {
            pulledCount,
            pushedCount,
            updatedCount,
            paymentsCount: payments.length,
            teamMembersCount: teamMembers.length,
            locationsCount: locations.length,
            cashDrawerShiftsCount: allShifts.length,
            individualShiftsCount: individualShiftsDetails.length,
            shiftEventsCount: allShiftEvents.length
        };

    } catch (error) {
        console.error('Error in executeSquarePOSDataSync:', error);

        // Log exception
        await squarePOSExceptionsModel.create({
            accountId,
            squarePOSIntegrationsCronId: cronId,
            errorType: 'sync_error',
            errorMessage: error.message,
            errorStack: error.stack
        });

        throw error;
    }
};