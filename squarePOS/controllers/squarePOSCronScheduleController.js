const schedule = require('node-schedule')
const humanToCron = require('human-to-cron')
const asyncWrapper = require('../middleware/asyncWrapper')
const squarePOSIntegrationsCronsModel = require('../models/squarePOSIntegrationsCronsModel')
const squarePOSIntegrationsSettingsModel = require('../models/squarePOSIntegrationSettingsModel')
const { schedulerIntegrationCronJobs } = require('../middleware/squarePOSIntegrationScheduleOperations')
let customConstants = require('../../config/constants.json')
// const job_each_minute = humanToCron('once each second')
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

    const existingCron = await squarePOSIntegrationsCronsModel.findOne({
        accountId: integration?.accountId,
        status: "initiated",
        createdAt: { $gte: twoHoursAgo, $lte: now },
    });
    console.log('existingCron:====', !!existingCron)
    return !!existingCron; // true if found, false otherwise
};


exports.squarePOSScheduleCronJobs = asyncWrapper(async () => {
    //Each minute
    schedule.scheduleJob(job_each_minute, async () => {
        // console.log("Square POS Cron Job Triggered - Each Minute");
        const squarePOSIntegrationsMasterSettingsDetails = await squarePOSIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each minute', "cronStatus": "start" }).populate("accountId")



        if (squarePOSIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of squarePOSIntegrationsMasterSettingsDetails) {

                let cronStatus = await validateTheCronStatus(integration)
                // let cronStatus = true
                if (!cronStatus) {
                    console.log("cronStatus===", cronStatus)
                    await schedulerIntegrationCronJobs(integration)
                }


            }
        }
    });


    //Each hour
    schedule.scheduleJob(job_each_hour, async () => {
        const squarePOSIntegrationsMasterSettingsDetails = await squarePOSIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each hour', "cronStatus": "start" }).populate("accountId")



        if (squarePOSIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of squarePOSIntegrationsMasterSettingsDetails) {

                let cronStatus = await validateTheCronStatus(integration)
                if (!cronStatus) {
                    await schedulerIntegrationCronJobs(integration)
                }
            }
        }
    });

    //Each day
    schedule.scheduleJob(job_each_day, async () => {
        const squarePOSIntegrationsMasterSettingsDetails = await squarePOSIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each day', "cronStatus": "start" }).populate("accountId")



        if (squarePOSIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of squarePOSIntegrationsMasterSettingsDetails) {

                let cronStatus = await validateTheCronStatus(integration)
                if (!cronStatus) {
                    await schedulerIntegrationCronJobs(integration)
                }
            }
        }
    });

    //Each month
    schedule.scheduleJob(job_each_month, async () => {
        const squarePOSIntegrationsMasterSettingsDetails = await squarePOSIntegrationsSettingsModel.find({ "periodSettings.periodType": 'once each month', "cronStatus": "start" }).populate("accountId")



        if (squarePOSIntegrationsMasterSettingsDetails.length > 0) {
            for (const integration of squarePOSIntegrationsMasterSettingsDetails) {

                let cronStatus = await validateTheCronStatus(integration)
                if (!cronStatus) {
                    await schedulerIntegrationCronJobs(integration)
                }
            }
        }
    });


});
