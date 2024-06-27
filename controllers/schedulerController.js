const schedule = require('node-schedule');
const humanToCron = require('human-to-cron');
// require('dotenv').config();

// const mongooseConnect = require('../config/dbConnection');
// mongooseConnect.DbConnect();
const integrationsSettingsModel = require('../models/integrationsMasterModels/integrationsSettingsModel');
const integrationsMasterModel = require('../models/integrationsMasterModels/integrationsMasterModel');
const integrationsMasterServiceProvidersModel = require('../models/integrationsMasterModels/integrationsMasterServiceProvidersModel');
const CPDWorkordersModel = require('../models/workOrdersModels/CPDWorkordersModel');
const { integrationsCronId } = require('../models/integrationsMasterModels/integrationsCronsModel');
const asyncWrapper = require('../middleware/asyncWrapper');
const CPDOperations = require('../middleware/CPDOperations');
const DFOperations = require('../middleware/DFOperations');
const integrationsFieldMappingModel = require('../models/integrationsMasterModels/integrationsFieldMappingModel');
const { schedulerIntegrationCronJobs } = require('../middleware/schedulerOperations');


const job_each_second = humanToCron('each second')
const job_each_minute = humanToCron('once each minute')
const job_each_hour = humanToCron('once each hour')
const job_each_day = humanToCron('once each day')
const job_each_month = humanToCron('once each month')


/**
 * Schedular for every second
 * Find list of integration which are configured = every-minute
 * Find & loop integrations and then authenticate & find respective work - orders (say CPD)
 * Insert cron-job details & cron-job logs into respective tables. 
 * Now loop the work orders & insert into respective tables say work - orders (say CPDWorkOrders)
 * Then prepare mapping-field-objects and push work - orders from source to destination (say CPD - DF)
 * Then log destination work - orders into respective table (say DFWorkOrders)
 * Then verity all.  
 * @returns success for perfect mapping of work-orders from source -> destination. 
 */

exports.integrationsScheduleCronJobsForEachMinute = asyncWrapper( async ()=> {
  
  schedule.scheduleJob(job_each_second, async () => {
    const integrationsMasterSettingsDetails = await integrationsSettingsModel.find({ periodType: 'each second', currentStatus : "start" }).populate('integrationsMasterId').lean();
    if (integrationsMasterSettingsDetails.length > 0) {
      for (const integration of integrationsMasterSettingsDetails) {
        await schedulerIntegrationCronJobs(integration)
        
      }
    }
  });
  schedule.scheduleJob(job_each_minute, async () => {
    const integrationsMasterSettingsDetails = await integrationsSettingsModel.find({ periodType: 'once each minute', currentStatus : "start" }).populate('integrationsMasterId').lean();
    if (integrationsMasterSettingsDetails.length > 0) {
      for (const integration of integrationsMasterSettingsDetails) {
        await schedulerIntegrationCronJobs(integration)
        
      }
    }
  });
  schedule.scheduleJob(job_each_hour, async () => {
    const integrationsMasterSettingsDetails = await integrationsSettingsModel.find({ periodType: 'once each hour', currentStatus : "start" }).populate('integrationsMasterId').lean();
    if (integrationsMasterSettingsDetails.length > 0) {
      for (const integration of integrationsMasterSettingsDetails) {
        await schedulerIntegrationCronJobs(integration)
        
      }
    }
  });
  schedule.scheduleJob(job_each_day, async () => {
    const integrationsMasterSettingsDetails = await integrationsSettingsModel.find({ periodType: 'once each day', currentStatus : "start" }).populate('integrationsMasterId').lean();
    if (integrationsMasterSettingsDetails.length > 0) {
      for (const integration of integrationsMasterSettingsDetails) {
        await schedulerIntegrationCronJobs(integration)
        
      }
    }
  });
  schedule.scheduleJob(job_each_month, async () => {
    const integrationsMasterSettingsDetails = await integrationsSettingsModel.find({ periodType: 'once each month', currentStatus : "start" }).populate('integrationsMasterId').lean();
    if (integrationsMasterSettingsDetails.length > 0) {
      for (const integration of integrationsMasterSettingsDetails) {
        await schedulerIntegrationCronJobs(integration)
        
      }
    }
  })
});
