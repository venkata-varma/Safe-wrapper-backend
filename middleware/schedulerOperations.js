const integrationsFieldMappingModel = require("../models/integrationsMasterModels/integrationsFieldMappingModel");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterModels/integrationsMasterServiceProvidersModel");
const CPDOperations = require('./CPDOperations');
const DFOperations = require('./DFOperations')

const schedulerIntegrationCronJobs = async (integrationObject) => {
    try {
        let schedulePeriodType = integrationObject.periodType;
        let scheduleInterval = integrationObject.periodSettings.interval;
        let lastPullTime = new Date(integrationObject.integrationsMasterId.lastPullDate);
        let scheduleTime = 0;
        let currentTime = new Date();

        if (schedulePeriodType === 'each second') {
            scheduleTime = (currentTime - lastPullTime) / 1000;
        } else if (schedulePeriodType === 'once each minute') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60);
            console.log('scheduleTime:===',scheduleTime)
        } else if (schedulePeriodType === 'once each hour') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60);
        } else if (schedulePeriodType === 'once each day') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 24);
        } else if (schedulePeriodType === 'once each month') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 24 * 30);
        }

        if (Math.round(scheduleTime) >= scheduleInterval) {
            if (integrationObject.integrationsMasterId.status === 'active' && integrationObject.integrationsMasterId.from === 'CPD' && integrationObject.integrationsMasterId.to === 'DF') {
                const CPDCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" }).lean();
                await CPDOperations.getCPDWorkOrders(CPDCredentials, typeOfCron = "automated");

                const DFCredentials = await integrationsFieldMappingModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, to: "DF" }).lean();
                await DFOperations.DFCreateWorkorders(DFCredentials, typeOfCron = "automated");
            } else if (integrationObject.integrationsMasterId.status === 'active' && integrationObject.integrationsMasterId.from === 'DF' && integrationObject.integrationsMasterId.to === 'CPD') {
                await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "DF" }).lean();
            } else {
                // nothing
            }
        }
        else{
            console.log('ScheduleTime is less than scheduleInterval')
        }
    } catch (error) {
        console.error('Error in schedulerIntegrationCronJobs:', error);
    }
};

module.exports = {
    schedulerIntegrationCronJobs
};
