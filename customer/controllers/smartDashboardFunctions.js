
const webHooksMasterModel = require("../../models/webHooksMasterModel");
const webhookMetaPayloadModel = require("../../models/webHookMetaPayloads");
const webhookPayloadTransactions = require("../../models/webhookPayloadTransactions");
const webhookPayloadHeaders = require("../../models/webhookPayloadHeaders");
const accountsModel = require("../../models/accountsModel");
const webhookExceptionsModel = require("../../models/webhookExceptionsModel");
const usersModel = require("../../models/usersModel");
const onePosLogsModel = require("../../models/onePosLogsModel");
const moment = require("moment");

const cardConnectTransactionsModel = require("../../cardConnect/models/cardConnectTransactionsModel");
const cardConnectTransactionLifeCycleModel = require("../../cardConnect/models/cardConnectTransactionLifeCycle");
const cardConnectIntegrationsCredentialsModel = require("../../cardConnect/models/cardConnectIntegrationsCredentialsModel");
const cardConnectIntegrationsAPIUrlFlowModel = require("../../cardConnect/models/cardConnectIntegrationsAPIUrlFlowModel");
const cardConnectIntegrationsSettingsModel = require("../../cardConnect/models/cardConnectIntegrationsSettingsModel");
const cardConnectExceptionsModel = require("../../cardConnect/models/cardConnectExceptionsModel");









exports.dashboardFiltersSafeCash = async (fromDate, toDate, serialNumbers, cashTransactionTypes, userNames, cashTransactionRange, accountId) => {

    console.log("fromDate, toDate, serialNumbers, cashTransactionTypes, userNames, cashTransactionRange", fromDate, toDate, serialNumbers, cashTransactionTypes, userNames, cashTransactionRange)
    if (!fromDate || !toDate) {
        throw new Error(' From date, and To date are required');
    }

    if (!moment(fromDate).isValid() || !moment(toDate).isValid()) {
        throw new Error('Invalid date format for fromDate or toDate');
    }

    let serialNumbersArray = [];

    serialNumbersArray = serialNumbers.includes(',')
        ? serialNumbers.split(',').map((s) => s.trim())
        : [serialNumbers];




    let cashTransactionTypesArray = [];

    cashTransactionTypesArray = cashTransactionTypes.includes(',')
        ? cashTransactionTypes.split(',').map((t) => t.trim())
        : [cashTransactionTypes];



    let matchConditions = {
        transactionDateTime: {
            $gte: moment(fromDate).toDate(),
            $lte: moment(toDate).toDate(),
        },
    };

    if (serialNumbersArray.length > 0) {
        matchConditions.serialNumber = { $in: serialNumbersArray };
    }

    if (cashTransactionTypesArray.length > 0) {
        matchConditions.transactionType = { $in: cashTransactionTypesArray };
    }

    if (cashTransactionRange) {
        var [fromRange, toRange] = cashTransactionRange.split('-')
        fromRange = parseInt(fromRange)
        toRange = parseInt(toRange)
        matchConditions.amount = {
            $gte: fromRange,
            $lte: toRange,
        }
    }
    var userNamesArray = []
    if (userNames) {
        userNamesArray = userNames.includes(',')
            ? userNames.split(',').map((s) => s.trim())
            : [userNames];


    }



    if (userNamesArray.length > 0) {
        matchConditions.userName = { $in: userNamesArray };
    }

    const pipeline = [];

    //   pipeline.push({
    //     $addFields: {
    //       transactionDateTime: { $toDate: '$transactionDateTime' },
    //     },
    //   });

    pipeline.push({
        $match: matchConditions,
    });

    pipeline.push({
        $sort: { transactionDateTime: -1 },
    });

    pipeline.push({
        $project: {
            webhookMasterId: 0,
            webhookMetaPayloadId: 0,
            accountId: 0,
            webhookTransactionId: 0,
        },
    });
console.log("pipleLine===", pipeline)
    const webhookTransactionDetails = await webhookPayloadTransactions.aggregate(pipeline);
console.log("webhookTransactionDetails===", webhookTransactionDetails)


    return webhookTransactionDetails




}



exports.dashboardFiltersCardConnect = async (cardConnecttransactionTypeKeys, cardConnectTransactionStatusKeys, allMerchantIds, customerDetails, batches, fromDate, toDate, cardTransactionRange) => {

}