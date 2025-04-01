const schedule = require('node-schedule')
const humanToCron = require('human-to-cron')
const webHooksMasterModel = require('../../models/webHooksMasterModel')
const { schedulerwebhookCronJobs } = require('../../middleware/webhookCronOperations')
const asyncWrapper = require('../../middleware/asyncWrapper')


const job_each_second = humanToCron('each second')
const job_each_minute = humanToCron('once each minute')
const job_each_hour = humanToCron('once each hour')
const job_each_day = humanToCron('once each day')
const job_each_month = humanToCron('once each month')


exports.webhookScheduleCronJobs= asyncWrapper( async ()=> {
  
    schedule.scheduleJob(job_each_second, async () => {
      const webhookMasterSettingsDetails = await webHooksMasterModel.find({ 'webhookSettings.periodType': 'each second', 'webhookSettings.currentStatus' : "start" }).lean();
      if (webhookMasterSettingsDetails.length > 0) {
      console.log('Cron triggered')

        for (const webhook of webhookMasterSettingsDetails) {
          await schedulerwebhookCronJobs(webhook) 
          
        }
      }
    });
    schedule.scheduleJob(job_each_minute, async () => {
      const webhookMasterSettingsDetails = await webHooksMasterModel.find({ 'webhookSettings.periodType': 'once each minute', 'webhookSettings.currentStatus' : "start" }).lean();
      if (webhookMasterSettingsDetails.length > 0) {
        for (const webhook of webhookMasterSettingsDetails) {
          await schedulerwebhookCronJobs(webhook)
          
        }
      }
    });
    schedule.scheduleJob(job_each_hour, async () => {
      const webhookMasterSettingsDetails = await webHooksMasterModel.find({ 'webhookSettings.periodType': 'once each hour', 'webhookSettings.currentStatus' : "start" }).lean();
      if (webhookMasterSettingsDetails.length > 0) {
        for (const webhook of webhookMasterSettingsDetails) {
          await schedulerwebhookCronJobs(webhook)
          
        }
      }
    });
    schedule.scheduleJob(job_each_day, async () => {
      const webhookMasterSettingsDetails = await webHooksMasterModel.find({ 'webhookSettings.periodType': 'once each day', 'webhookSettings.currentStatus' : "start" }).lean();
      if (webhookMasterSettingsDetails.length > 0) {
        for (const webhook of webhookMasterSettingsDetails) {
          await schedulerwebhookCronJobs(webhook)
          
        }
      }
    });
    schedule.scheduleJob(job_each_month, async () => {
      const webhookMasterSettingsDetails = await webHooksMasterModel.find({ 'webhookSettings.periodType': 'once each month', 'webhookSettings.currentStatus' : "start" }).populate('integrationsMasterId').lean();
      if (webhookMasterSettingsDetails.length > 0) {
        for (const webhook of webhookMasterSettingsDetails) {
          await schedulerwebhookCronJobs(webhook)
          
        }
      }
    })
  });