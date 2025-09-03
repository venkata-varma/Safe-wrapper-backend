const schedule = require('node-schedule')
const humanToCron = require('human-to-cron')
const asyncWrapper = require('../middleware/asyncWrapper')

const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const { schedulerIntegrationCronJobs } = require('../middleware/integrationScheduleOperations')

const job_each_minute = humanToCron('once each minute')
const job_each_hour = humanToCron('once each hour')
const job_each_day = humanToCron('once each day')
const job_each_month = humanToCron('once each month')


exports.cardConnectScheduleCronJobs = asyncWrapper(async () => {

    schedule.scheduleJob(job_each_minute, async () => {

        console.log("each minute")
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each minute', "periodSettings.currentStatus": "start" }).populate("accountId")


        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {
                await schedulerIntegrationCronJobs(integration)

            }
        }
    });







    schedule.scheduleJob(job_each_hour, async () => {
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each hour', "periodSettings.currentStatus": "start" }).populate("accountId")



        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {
                await schedulerIntegrationCronJobs(integration)

            }
        }
    });

    schedule.scheduleJob(job_each_day, async () => {
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each day', "periodSettings.currentStatus": "start" }).populate("accountId")



        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {
                await schedulerIntegrationCronJobs(integration)

            }
        }
    });


 schedule.scheduleJob(job_each_month, async () => {
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each month', "periodSettings.currentStatus": "start" }).populate("accountId")



        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {
                await schedulerIntegrationCronJobs(integration)

            }
        }
    });



});
