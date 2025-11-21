const mongoose = require('mongoose')

const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const cardConnectIntegrationsAPIUrlsFlowModel = require('../models/cardConnectIntegrationsAPIUrlFlowModel')
const cardConnectTransactionsModel = require('../models/cardConnectTransactionsModel')
const cardConnectIntegrationsCronsModel = require('../models/cardConnectIntegrationsCronsModel')
const { generateDateRange, generateDateArray } = require('../utils/helpers');
const { initiateManualTrigger } = require('../utils/authenticationResponse')
const asyncWrapper = require('./asyncWrapper')
const accountsModel = require('../../models/accountsModel')


const initiateCronJob = async (integration) => {
    const { accountId } = integration?.accountId;

    let integrationsMasterDetails = await accountsModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(accountId)
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationscredentials",
                localField: "_id",
                foreignField: "accountId",
                as: "cardconnectintegrationscredentials"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationsapiurlflows",
                localField: "_id",
                foreignField: "accountId",
                as: "cardconnectintegrationsapiurlflows"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationssettings",
                localField: "_id",
                foreignField: "accountId",
                as: "cardconnectintegrationssettings"
            }
        },
        { $unwind: "$cardconnectintegrationscredentials" },
        { $unwind: "$cardconnectintegrationsapiurlflows" },
        { $unwind: "$cardconnectintegrationssettings" }

    ])

    //----------------------------------


    let dateDumpRange = integrationsMasterDetails[0].cardconnectintegrationssettings.dataDumpRange;
    console.log("dateDumpRange===", dateDumpRange)

    let dateRange = generateDateRange(dateDumpRange);
    console.log("dateRange===", dateRange)

    //-------------------------
    let createIntegrationsCron = await cardConnectIntegrationsCronsModel.create({

        accountId: integrationsMasterDetails[0].accountId,
        userId: integrationsMasterDetails[0].userId,
        dateRange,
        cronJobType: "automated"
    })

    await cardConnectIntegrationsSettingsModel.findOneAndUpdate({ accountId }, { $set: { lastPullDate: new Date(), lastIntgerationsCronId: createIntegrationsCron._id } }, { new: true, runValidators: true })

    let initiateManualPull = await initiateManualTrigger(dateRange, integrationsMasterDetails[0], accountId, createIntegrationsCron._id);


    await cardConnectIntegrationsCronsModel.findByIdAndUpdate(createIntegrationsCron._id,
        {
            $set: {

                status: "completed"

            }
        }, { new: true, runValidators: true })



}








exports.schedulerIntegrationCronJobs = async (integration) => {
    try {



        let schedulePeriodType = integration?.periodSettings?.periodType;
        let scheduleInterval = integration?.periodSettings?.interval;
        let lastPullTime = new Date(integration?.lastPullDate);
        let scheduleTime = 0;
        let currentTime = new Date();

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

                await initiateCronJob(integration)
            }
        }
        else {
            console.log('ScheduleTime is less than scheduleInterval')
        }
    } catch (error) {
        console.error('Error in schedulerIntegrationCronJobs:', error);
    }

}