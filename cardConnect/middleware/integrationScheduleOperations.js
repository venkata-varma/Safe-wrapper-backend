const mongoose = require('mongoose')
const cardconnectIntegrationsMastersModel = require('../models/cardConnectIntegrationsMasterModel')
const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const cardConnectIntegrationsAPIUrlsFlowModel = require('../models/cardConnectIntegrationsAPIUrlFlowModel')
const cardConnectAPIUrlFlowModel = require('../models/cardConnectAPIUrlFlowsModel')
const cardConnectTransactionsModel = require('../models/cardConnectTransactionsModel')
const cardConnectIntegrationsCronsModel = require('../models/cardConnectIntegrationsCronsModel')
const { generateDateRange, generateDateArray } = require('../utils/helpers');
const { initiateManualTrigger } = require('../utils/authenticationResponse')


const initiateCronJob = async (integration) => {
    const { cardConnectIntegrationsMasterId } = integration.cardConnectIntegrationsMasterId

    let integrationsMasterDetails = await cardconnectIntegrationsMastersModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(cardConnectIntegrationsMasterId)
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationscredentials",
                localField: "_id",
                foreignField: "cardConnectIntegrationsMasterId",
                as: "cardconnectintegrationscredentials"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationsapiurlflows",
                localField: "_id",
                foreignField: "cardConnectIntegrationsMasterId",
                as: "cardconnectintegrationsapiurlflows"
            }
        },
        {
            $lookup: {
                from: "cardconnectintegrationssettings",
                localField: "_id",
                foreignField: "cardConnectIntegrationsMasterId",
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
        cardConnectIntegrationsMasterId: cardConnectIntegrationsMasterId,
        accountId: integrationsMasterDetails[0].accountId,
        userId: integrationsMasterDetails[0].userId,
        dateRange,
        cronJobType: "automated"
    })
// console.log("createIntegrationsCron===", createIntegrationsCron)

    await cardconnectIntegrationsMastersModel.findByIdAndUpdate(cardConnectIntegrationsMasterId, { $set: { lastPullDate: new Date(), lastIntgerationsCronId: createIntegrationsCron._id } }, { new: true, runValidators: true })

    let initiateManualPull = await initiateManualTrigger(dateRange, integrationsMasterDetails[0], cardConnectIntegrationsMasterId, createIntegrationsCron._id);


    await cardConnectIntegrationsCronsModel.findByIdAndUpdate(createIntegrationsCron._id,
        {
            $set: {

                status: "completed"

            }
        }, { new: true, runValidators: true })



}








exports.schedulerIntegrationCronJobs = async (integration) => {
    try {
        console.log("try block",)


        let schedulePeriodType = integration?.periodSettings?.periodType;
        let scheduleInterval = integration?.periodSettings?.interval;
        let lastPullTime = new Date(integration?.cardConnectIntegrationsMasterId?.lastPullDate);
        let scheduleTime = 0;
        let currentTime = new Date();

        if (schedulePeriodType === 'each second') {
            scheduleTime = (currentTime - lastPullTime) / 1000;
        } else if (schedulePeriodType === 'once each minute') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60);
            console.log('scheduleTime:===', scheduleTime)
        } else if (schedulePeriodType === 'once each hour') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60);
        } else if (schedulePeriodType === 'once each day') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 24);
        } else if (schedulePeriodType === 'each 5 minutes') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 5);
        }else if (schedulePeriodType === 'once each three hours') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 3);
        }else if (schedulePeriodType === 'once each twelve hours') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 12);
        }





        console.log('lastPullDate:===', lastPullTime)
        console.log('currentTime:===', currentTime)
        console.log('scheduleTime:===', scheduleTime)

        if (Math.round(scheduleTime) >= scheduleInterval) {
            if (integration?.cardConnectIntegrationsMasterId?.status === 'active') {
                console.log("write main function here")
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