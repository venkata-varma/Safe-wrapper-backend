const schedule = require('node-schedule')
const humanToCron = require('human-to-cron')
const asyncWrapper = require('../middleware/asyncWrapper')
const cardConnectIntegrationsMasterModel = require('../models/cardConnectIntegrationsMasterModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const { schedulerIntegrationCronJobs } = require('../middleware/integrationScheduleOperations')

const job_each_second = humanToCron('once each second')
const job_each_minute = humanToCron('once each minute')
const job_each_five_minute = humanToCron('each 5 minutes')
const job_each_hour = humanToCron('once each hour')
const job_each_day = humanToCron('once each day')






exports.cardConnectScheduleCronJobs = asyncWrapper(async () => {

    schedule.scheduleJob(job_each_minute, async () => {

        console.log("each minute")
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each minute', "periodSettings.currentStatus": "start" }).populate("cardConnectIntegrationsMasterId")


        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {
                await schedulerIntegrationCronJobs(integration)

            }
        }
    });





    schedule.scheduleJob(job_each_five_minute, async () => {
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'each 5 minutes', "periodSettings.currentStatus": "start" }).populate("cardConnectIntegrationsMasterId")


        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {
                await schedulerIntegrationCronJobs(integration)

            }
        }
    });
    schedule.scheduleJob(job_each_hour, async () => {
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each hour', "periodSettings.currentStatus": "start" }).populate("cardConnectIntegrationsMasterId")



        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {
                await schedulerIntegrationCronJobs(integration)

            }
        }
    });

    schedule.scheduleJob(job_each_day, async () => {
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each day', "periodSettings.currentStatus": "start" }).populate("cardConnectIntegrationsMasterId")



        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {
                await schedulerIntegrationCronJobs(integration)

            }
        }
    });


});
