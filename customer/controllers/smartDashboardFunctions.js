
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
    fromDate = moment.utc(fromDate).startOf("day").toDate();
    toDate = moment.utc(toDate).endOf("day").toDate()

    let serialNumbersArray = [];
    if (serialNumbers) {
        serialNumbersArray = serialNumbers.includes(',')
            ? serialNumbers.split(',').map((s) => s.trim())
            : [serialNumbers];


    }

    let cashTransactionTypesArray = [];
    if (cashTransactionTypes) {
        cashTransactionTypesArray = cashTransactionTypes.includes(',')
            ? cashTransactionTypes.split(',').map((t) => t.trim())
            : [cashTransactionTypes];


    }

    var [fromRange, toRange] = cashTransactionRange.split('-')
    fromRange = parseInt(fromRange)
    toRange = parseInt(toRange)

    var userNamesArray = []
    if (userNames) {
        userNamesArray = userNames.includes(',')
            ? userNames.split(',').map((s) => s.trim())
            : [userNames];


    }


    let matchConditions = {
        transactionDateTimeType: {
            $gte: fromDate,
            $lte: toDate,
        },
        amount: {
            $gte: fromRange,
            $lte: toRange,
        },
    };

    if (userNamesArray.length > 0) {
        matchConditions.userName = { $in: userNamesArray };
    }


    if (serialNumbersArray.length > 0) {
        matchConditions.serialNumber = { $in: serialNumbersArray };
    }

    if (cashTransactionTypesArray.length > 0) {
        matchConditions.transactionType = { $in: cashTransactionTypesArray };
    }
    console.log("fromDate--=", fromDate);
    console.log("toDate--=", toDate);
    const webhookTransactionDetails = await webhookPayloadTransactions.aggregate([
        {
            $addFields: {
                transactionDateTimeType: { $toDate: "$transactionDateTime" },
                category: "cash"
            }
        },

        {
            $match: matchConditions
        },
        { $sort: { transactionDateTime: -1 } },
        {
            $project: {
                webhookMasterId: 0,
                webhookMetaPayloadId: 0,
                accountId: 0,
                webhookTransactionId: 0,
                transactionDateTime: 0
            }
        }
    ]);

    console.log("webhookTransactionDetails===", webhookTransactionDetails.length)

    return webhookTransactionDetails




}



exports.dashboardFiltersCardConnect = async (cardConnecttransactionTypeKeys, cardConnectTransactionStatusKeys, allMerchantIds, customerDetails, batchNumber, fromDate, toDate, cardTransactionRange) => {

    if (!fromDate || !toDate) {
        throw new Error(' From date, and To date are required');
    }

    if (!moment(fromDate).isValid() || !moment(toDate).isValid()) {
        throw new Error('Invalid date format for fromDate or toDate');
    }
    fromDate = moment.utc(fromDate).startOf("day").toDate();
    toDate = moment.utc(toDate).endOf("day").toDate()


    var [fromRange, toRange] = cardTransactionRange.split('-')
    fromRange = parseInt(fromRange)
    toRange = parseInt(toRange)


    let cardTransactionStatusArray = [];
    if (cardConnectTransactionStatusKeys) {
        cardTransactionStatusArray = cardConnectTransactionStatusKeys.includes(',')
            ? cardConnectTransactionStatusKeys.split(',').map((s) => s.trim())
            : [cardConnectTransactionStatusKeys];


    }


    let customerDetailsArray = [];
    if (customerDetails) {
        customerDetailsArray = customerDetails.includes(',')
            ? customerDetails.split(',').map((s) => s.trim())
            : [customerDetails];


    }


    let batchNumberArray = [];
    if (batchNumber) {
        batchNumberArray = batchNumber.includes(',')
            ? batchNumber.split(',').map((s) => s.trim())
            : [batchNumber];


    }



    let cardTransactionTypesArray = [];
    if (cardConnecttransactionTypeKeys) {
        cardTransactionTypesArray = cardConnecttransactionTypeKeys.includes(',')
            ? cardConnecttransactionTypeKeys.split(',').map((t) => t.trim())
            : [cardConnecttransactionTypeKeys];


    }
    console.log("fromDate-=-", fromDate)
    console.log("toDate-=-", toDate)

    // let matchConditions = {
    //     capturedDate: {
    //         $gte: fromDate,
    //         $lte: toDate,
    //     },
    //     amount: {
    //         $gte: fromRange,
    //         $lte: toRange,
    //     },
    // };


    // if (cardTransactionStatusArray.length > 0) {
    //     matchConditions.transactionStatus = { $in: cardTransactionStatusArray };
    // }


    // if (customerDetailsArray.length > 0) {
    //     matchConditions.customerCardLastFour = { $in: customerDetailsArray };
    // }

    // if (batchNumberArray.length > 0) {
    //     matchConditions.batchId = { $in: batchNumberArray };
    // }


    // if (cardTransactionTypesArray.length > 0) {
    //     matchConditions.transactionType = { $in: cardTransactionTypesArray };
    // }


    //----------------------__End of tuning requirements and start of aggregate----------------
    const cardTransactionDetails = await cardConnectTransactionsModel.aggregate([
        {
            $addFields: {

                amount: { $toDouble: "$responseObject.amount" },
                customerName: "$customerDetails.name",
                transactionType: "$responseObject.type",
                transactionStatus: "$responseObject.status",
                merchantId: "$responseObject.merchid",
                currency: "$responseObject.currency",
                customerCardLastFour: "$customerDetails.lastFour",
                transactionDate: { $toDate: "$responseObject.date" },
                batchId: "$responseObject.batchid",
                settledDate: {
                    $dateFromString: {
                        dateString: {
                            $concat: [
                                { $substr: ["$responseObject.settledate", 0, 4] }, "-", // YYYY
                                { $substr: ["$responseObject.settledate", 4, 2] }, "-", // MM
                                { $substr: ["$responseObject.settledate", 6, 2] }, "T", // DD
                                { $substr: ["$responseObject.settledate", 8, 2] }, ":", // HH
                                { $substr: ["$responseObject.settledate", 10, 2] }, ":", // mm
                                { $substr: ["$responseObject.settledate", 12, 2] }, "Z" // ss
                            ]
                        }
                    }
                },
                capturedDate: {
                    $dateFromString: {
                        dateString: {
                            $concat: [
                                { $substr: ["$responseObject.capturedate", 0, 4] }, "-",
                                { $substr: ["$responseObject.capturedate", 4, 2] }, "-",
                                { $substr: ["$responseObject.capturedate", 6, 2] }, "T",
                                { $substr: ["$responseObject.capturedate", 8, 2] }, ":",
                                { $substr: ["$responseObject.capturedate", 10, 2] }, ":",
                                { $substr: ["$responseObject.capturedate", 12, 2] }, "Z"
                            ]
                        }
                    }
                },
                category: "card"
            }
        },
        {
            $match: {
                capturedDate: {
                    $gte: fromDate,
                    $lte: toDate
                },
                amount: {
                    $gte: fromRange,
                    $lte: toRange
                },
                ...(cardTransactionStatusArray.length > 0 && { transactionStatus: { $in: cardTransactionStatusArray } }),
                ...(customerDetailsArray.length > 0 && { customerCardLastFour: { $in: customerDetailsArray } }),
                ...(batchNumberArray.length > 0 && { batchId: { $in: batchNumberArray } }),
                ...(cardTransactionTypesArray.length > 0 && { transactionType: { $in: cardTransactionTypesArray } }),

            }
        },
        { $sort: { transactionDate: -1 } },
        {
            $project: {
                cardConnectIntegrationsCronIdCreate: 0,
                cardConnectIntegrationsCronIdUpdate: 0,
                accountId: 0,
                userId: 0,
                responseObject: 0,
                cardConnectTransactionId: 0,
                updatedBy: 0,
                createdBy: 0
            }
        }
    ]);
    // console.log("cardTransactionDetails===", (cardTransactionDetails[0].capturedDate))
    return cardTransactionDetails
}