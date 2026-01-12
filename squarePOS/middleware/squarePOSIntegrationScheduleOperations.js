const mongoose = require('mongoose');
const squarePOSIntegrationsSettingsModel = require('../models/squarePOSIntegrationSettingsModel');
const squarePOSIntegrationsCronsModel = require('../models/squarePOSIntegrationsCronsModel');
const squarePOSMasterCredentialsModel = require('../models/squarePOSCredentialsModel');
const accountsModel = require('../../models/accountsModel');
const { generateDateRange, generateSquareDateRange } = require('../utils/helpers');
const { executeSquarePOSDataSync } = require('../services/squarePOSDataSyncService');
const asyncWrapper = require('../middleware/asyncWrapper');

const initiateCronJob = async (integration) => {
    const { accountId } = integration?.accountId;
    const integrationsMasterDetails = await accountsModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(accountId)
            }
        },
        {
            $lookup: {
                from: "squareposcredentialsmodels",
                localField: "_id",
                foreignField: "accountId",
                as: "credentials"
            }
        },
        {
            $lookup: {
                from: "squareposintegrationssettings",
                localField: "_id",
                foreignField: "accountId",
                as: "settings"
            }
        },
        { $unwind: "$credentials" },
        { $unwind: "$settings" }
    ]);

    if (integrationsMasterDetails.length === 0) {
        console.error('No integration details found for accountId:', accountId);
        return;
    }
    const masterData = integrationsMasterDetails[0];
    // Create cron record
    const createIntegrationsCron = await squarePOSIntegrationsCronsModel.create({
        accountId: masterData.accountId,
        userId: masterData.userId,
        // dateRange,
        status: "initiated",
        cronJobType: "automated"
    });
    console.log("createIntegrationsCron===", createIntegrationsCron._id)

    // Update last pull date
    await squarePOSIntegrationsSettingsModel.findOneAndUpdate(
        { accountId },
        {
            $set: {
                lastPullDate: new Date(),
                lastIntgerationsCronId: createIntegrationsCron._id
            }
        },
        { new: true, runValidators: true }
    );

    // Get integration master details with credentials and settings


    const dataDumpRange = masterData?.settings?.dataDumpRange;


    const dateRanges = generateSquareDateRange(dataDumpRange);




    try {
        // Execute the data sync
        await executeSquarePOSDataSync({
            accountId,
            userId: masterData.userId,
            cronId: createIntegrationsCron._id,
            credentials: masterData.credentials,
            dateRanges
        });

        // Mark as completed
        await squarePOSIntegrationsCronsModel.findByIdAndUpdate(
            createIntegrationsCron._id,
            {
                $set: {
                    status: "completed"
                }
            },
            { new: true, runValidators: true }
        );
    } catch (error) {
        console.error('Error in executeSquarePOSDataSync:', error);

        // Mark as failed
        await squarePOSIntegrationsCronsModel.findByIdAndUpdate(
            createIntegrationsCron._id,
            {
                $set: {
                    status: "failed"
                }
            },
            { new: true, runValidators: true }
        );
    }
};

exports.schedulerIntegrationCronJobs = async (integration) => {
    try {
        const schedulePeriodType = integration?.periodSettings?.periodType;
        const scheduleInterval = integration?.periodSettings?.interval;
        const lastPullTime = new Date(integration?.lastPullDate);
        const currentTime = new Date();

        let scheduleTime = 0;

        if (schedulePeriodType === 'once each minute') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60);
        } else if (schedulePeriodType === 'once each hour') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60);
        } else if (schedulePeriodType === 'once each day') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 24);
        } else if (schedulePeriodType === 'once each month') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 24 * 30);
        }

        if (Math.round(scheduleTime) >= scheduleInterval) {
            if (integration?.accountId?.status === 'active') {
                await initiateCronJob(integration);
            }
        } else {
            console.log('ScheduleTime is less than scheduleInterval');
        }
    } catch (error) {

        console.error('Error in schedulerIntegrationCronJobs:', error);
    }
};