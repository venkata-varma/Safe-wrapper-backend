const schedule = require('node-schedule')
const humanToCron = require('human-to-cron')
const asyncWrapper = require('../middleware/asyncWrapper')
const cardConnectIntegrationsCronsModel = require('../models/cardConnectIntegrationsCronsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const { schedulerIntegrationCronJobs } = require('../middleware/integrationScheduleOperations')
let customConstants = require('../../config/constants.json')
const job_each_minute = humanToCron('once each minute')
const job_each_hour = humanToCron('once each hour')
const job_each_day = humanToCron('once each day')
const job_each_month = humanToCron('once each month')
const moment = require('moment');




const validateTheCronStatus = async (integration) => {
    // Current time and 2 hours back using moment
    const hoursToSubtract = customConstants?.statusCodes?.STOP_UPDATE_AUTOCRON_INPROGRESS_EXECUTION || 1;
    const now = moment().toDate();
    const twoHoursAgo = moment(now).subtract(hoursToSubtract, "hours").toDate();

    const existingCron = await cardConnectIntegrationsCronsModel.findOne({
        accountId: integration?.accountId,
        status: "initiated",
        createdAt: { $gte: twoHoursAgo, $lte: now },
    });
    console.log('existingCron:====', !!existingCron)
    return !!existingCron; // true if found, false otherwise
};


exports.cardConnectScheduleCronJobs = asyncWrapper(async () => {
    //Each minute
    schedule.scheduleJob(job_each_minute, async () => {
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each minute', "periodSettings.currentStatus": "start" }).populate("accountId")



        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {

                let cronStatus = await validateTheCronStatus(integration)
                if (!cronStatus) {
                    console.log("cronStatus===", cronStatus)
                    await schedulerIntegrationCronJobs(integration)
                }


            }
        }
    });


    //Each hour
    schedule.scheduleJob(job_each_hour, async () => {
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each hour', "periodSettings.currentStatus": "start" }).populate("accountId")



        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {

                let cronStatus = await validateTheCronStatus(integration)
                if (!cronStatus) {
                    await schedulerIntegrationCronJobs(integration)
                }
            }
        }
    });

    //Each day
    schedule.scheduleJob(job_each_day, async () => {
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each day', "periodSettings.currentStatus": "start" }).populate("accountId")



        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {

                let cronStatus = await validateTheCronStatus(integration)
                if (!cronStatus) {
                    await schedulerIntegrationCronJobs(integration)
                }
            }
        }
    });

    //Each month
    schedule.scheduleJob(job_each_month, async () => {
        const cardConnectIntegrationsMasterSettingsDetails = await cardConnectIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each month', "periodSettings.currentStatus": "start" }).populate("accountId")



        if (cardConnectIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of cardConnectIntegrationsMasterSettingsDetails) {

                let cronStatus = await validateTheCronStatus(integration)
                if (!cronStatus) {
                    await schedulerIntegrationCronJobs(integration)
                }
            }
        }
    });



});
