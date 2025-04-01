const webHookMetaPayloads = require("../models/webHookMetaPayloads");



exports.schedulerwebhookCronJobs = async(webhook) => {
    try {
        let schedulePeriodType = webhook?.webhookSettings?.periodType;
        let scheduleInterval = webhook?.webhookSettings?.interval;
        let lastPullTime = new Date(webhook?.lastPullDate);
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
            console.log('scheduleTime:===')
            if ( webhook?.status === 'active') {
                const webhookMetaPayloadsDetails = await webHookMetaPayloads.find({$and:[{createdAt:{$gte :lastPullTime}},{createdAt:{$lte:currentTime}}]})
            }
        }
        else{
            console.log('ScheduleTime is less than scheduleInterval')
        }
    } catch (error) {
        console.error('Error in schedulerIntegrationCronJobs:', error);
    }
}