const webHookMetaPayloads = require("../models/webHookMetaPayloads");
const webhookPayloadHeaders = require("../models/webhookPayloadHeaders");
const webhookPayloadTransactions = require("../models/webhookPayloadTransactions");
const webHooksMasterModel = require("../models/webHooksMasterModel");



exports.schedulerwebhookCronJobs = async (webhook) => {
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
            console.log('scheduleTime:===', scheduleTime)
        } else if (schedulePeriodType === 'once each hour') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60);
        } else if (schedulePeriodType === 'once each day') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 24);
        } else if (schedulePeriodType === 'once each month') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 24 * 30);
        }

        if (Math.round(scheduleTime) >= scheduleInterval) {
            if (webhook?.status === 'active') {
                await webhookMetaPayloadsOperations(await webHookMetaPayloads.find({ $and: [{ createdAt: { $gte: lastPullTime } }, { createdAt: { $lte: currentTime } }] }))
            }
        }
        else {
            console.log('ScheduleTime is less than scheduleInterval')
        }
    } catch (error) {
        console.error('Error in schedulerIntegrationCronJobs:', error);
    }
}

const webhookMetaPayloadsOperations = async (webHookMetaPayloads) => {
    for (let data of webHookMetaPayloads) {
        await webhookMetaPayloadTransactions(data?.dataPoint, data?.webhookMasterId, data?.webhookMetaPayloadId, data?.accountId)
    }

}

const webhookMetaPayloadTransactions = async (dataPoint, webhookMasterId, webhookMetaPayloadId, accountId) => {
    if(dataPoint && dataPoint.Transactions.length > 0 ){
        for (let transaction of dataPoint?.Transactions) {
            await webHookMetaPayloads.findByIdAndUpdate(webhookMetaPayloadId, { $set: { status: "in-progress" } })
            await webhookPayloadTransactions.create({
                webhookMasterId: webhookMasterId,
                webhookMetaPayloadId: webhookMetaPayloadId,
                accountId: accountId,
                pickupGroupId: transaction?.PickupGroupId,
                serialNumber: transaction?.SerialNumber,
                retrievedOn: transaction?.RetrievedOn,
                transactionDateTime: transaction?.TransactionDateTime,
                userName: transaction?.UserName,
                transactionType: transaction?.TransactionType,
                amount: transaction?.Amount,
                denominations: transaction?.Denominations,
                location: dataPoint?.Metadata?.LocationInformation[0]?.Location,
            });
    
            await webhookPayloadHeaders.create({
                webhookMasterId: webhookMasterId,
                webhookMetaPayloadId: webhookMetaPayloadId,
                accountId: accountId,
                pickupGroupId: transaction?.PickupGroupId,
                serialNumber: transaction?.SerialNumber,
                retrievedOn: transaction?.RetrievedOn,
                transactionDateTime: transaction?.TransactionDateTime,
                userName: transaction?.UserName,
                transactionType: transaction?.TransactionType,
                location: dataPoint?.Metadata?.LocationInformation[0]?.Location,
            })
            await webHookMetaPayloads.findByIdAndUpdate(webhookMetaPayloadId, { $set: { status: "executed" } })
        }
        await webHooksMasterModel.findByIdAndUpdate(webhookMasterId, { $set: { lastPullDate: new Date() } }, { new: true })
        console.log('Exit')
    }
    else{
        // Exit
    }
    
}

