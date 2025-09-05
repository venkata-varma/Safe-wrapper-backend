
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









exports.dashboardFiltersSafeCash = async (fromDate, toDate, serialNumbers, cashTransactionTypes, userNames, cashTransactionRange) => {


    if (!fromDate || !toDate) {
        throw new Error(' From date, and To date are required');
    }

    if (!moment(fromDate).isValid() || !moment(toDate).isValid()) {
        throw new Error('Invalid date format for fromDate or toDate');
    }

    let serialNumbersArray = [];
    if (serialNumbers && serialNumbers !== 'all') {
        serialNumbersArray = serialNumbers.includes(',')
            ? serialNumbers.split(',').map((s) => s.trim())
            : [serialNumbers];
    }






}



exports.dashboardFiltersCardConnect = async (cardConnecttransactionTypeKeys, cardConnectTransactionStatusKeys, allMerchantIds, customerDetails, batches, fromDate, toDate, cardTransactionRange) => {

}