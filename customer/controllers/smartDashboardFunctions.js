
const webHooksMasterModel = require("../../models/webHooksMasterModel");
const webhookMetaPayloadModel = require("../../models/webHookMetaPayloads");
const webhookPayloadTransactions = require("../../models/webhookPayloadTransactions");
const webhookPayloadHeaders = require("../../models/webhookPayloadHeaders");
const accountsModel = require("../../models/accountsModel");
const webhookExceptionsModel = require("../../models/webhookExceptionsModel");
const usersModel = require("../../models/usersModel");
const onePosLogsModel = require("../../models/onePosLogsModel");
const moment = require("moment");
let mongoose = require('mongoose')
const cardConnectTransactionsModel = require("../../cardConnect/models/cardConnectTransactionsModel");
const cardConnectTransactionLifeCycleModel = require("../../cardConnect/models/cardConnectTransactionLifeCycle");
const cardConnectIntegrationsCredentialsModel = require("../../cardConnect/models/cardConnectIntegrationsCredentialsModel");
const cardConnectIntegrationsAPIUrlFlowModel = require("../../cardConnect/models/cardConnectIntegrationsAPIUrlFlowModel");
const cardConnectIntegrationsSettingsModel = require("../../cardConnect/models/cardConnectIntegrationsSettingsModel");
const cardConnectExceptionsModel = require("../../cardConnect/models/cardConnectExceptionsModel");







//fromDate, toDate, merchantNamesArray, selectDashboardArray, serialNumbers, cashTransactionTypes, ""

exports.dashboardFiltersSafeCash = async (fromDate, toDate, merchantNamesArray, selectDashboardArray, serialNumbers, cashTransactionTypes, accountId) => {

    // console.log("fromDate, toDate, merchantNamesArray, selectDashboardArray, serialNumbers, cashTransactionTypes, accountId ", fromDate, toDate, merchantNamesArray, selectDashboardArray, serialNumbers, cashTransactionTypes, accountId)
    if (!fromDate || !toDate) {
        throw new Error(' From date, and To date are required');
    }

    if (!moment(fromDate).isValid() || !moment(toDate).isValid()) {
        throw new Error('Invalid date format for fromDate or toDate');
    }
    fromDate = new Date(moment(fromDate).format('YYYY-MM-DDTHH:mm:ss'))
    toDate = new Date(moment(toDate).format('YYYY-MM-DDTHH:mm:ss'))
    console.log("fromDate===", fromDate)
    console.log("toDate===", toDate)


    console.log("merchantNamesArray===", merchantNamesArray)

    merchantNamesArray = merchantNamesArray
        .filter(id => id && id.length === 24) // keep only valid ObjectId strings
        .map(id => new mongoose.Types.ObjectId(id));


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





    let matchConditions = {
        transactionDate: {
            $gte: fromDate,
            $lte: toDate,
        },

    };



    if (serialNumbersArray.length > 0) {
        matchConditions.serialNumber = { $in: serialNumbersArray };
    }

    if (cashTransactionTypesArray.length > 0) {
        matchConditions.transactionType = { $in: cashTransactionTypesArray };
    }
    console.log("fromDate--=", fromDate);
    console.log("toDate--=", toDate);

    var webhookTransactionDetails
    if (merchantNamesArray.length === 0) {
        webhookTransactionDetails = []
        return webhookTransactionDetails
    }


    webhookTransactionDetails = await webhookPayloadTransactions.aggregate([
        {
            $match: {
                accountId: {
                    $in: merchantNamesArray
                }
            }
        },
        {
            $addFields: {
                transactionDate: { $toDate: "$transactionDateTime" },
                paymentType: "cima-machine"
            }
        },

        {
            $match: matchConditions
        },
        { $sort: { transactionDate: -1 } },
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









exports.dashboardFiltersCardConnect = async (cardTransactionTypes, cardTransactionStatus, customerDetails, batchNumber, fromDate, toDate, accountId, merchantNamesArray, selectDashboardArray) => {


    if (!fromDate || !toDate) {
        throw new Error(' From date, and To date are required');
    }

    if (!moment(fromDate).isValid() || !moment(toDate).isValid()) {
        throw new Error('Invalid date format for fromDate or toDate');
    }
    fromDate = new Date(moment(fromDate).format('YYYY-MM-DDTHH:mm:ss'))
    toDate = new Date(moment(toDate).format('YYYY-MM-DDTHH:mm:ss'))
    console.log("fromDate===", fromDate)
    console.log("toDate===", toDate)


    merchantNamesArray = merchantNamesArray
        .filter(id => id && id.length === 24) // keep only valid ObjectId strings
        .map(id => new mongoose.Types.ObjectId(id));

    let cardTransactionStatusArray = [];
    if (cardTransactionStatus) {
        cardTransactionStatusArray = cardTransactionStatus.includes(',')
            ? cardTransactionStatus.split(',').map((s) => s.trim())
            : [cardTransactionStatus];


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
    if (cardTransactionTypes) {
        cardTransactionTypesArray = cardTransactionTypes.includes(',')
            ? cardTransactionTypes.split(',').map((t) => t.trim())
            : [cardTransactionTypes];


    }
    console.log("fromDate-=-", fromDate)
    console.log("toDate-=-", toDate)
    var cardTransactionDetails
    if (merchantNamesArray.length === 0) {
        cardTransactionDetails = []
        return cardTransactionDetails
    }


    //----------------------__End of tuning requirements and start of aggregate----------------
    cardTransactionDetails = await cardConnectTransactionsModel.aggregate([
        {
            $match: {
                accountId: {
                    $in: merchantNamesArray
                }
            }
        },


        {
            $addFields: {

                amount: { $toDouble: "$responseObject.amount" },
                customerByCard: "$customerDetails.cardNumber",
                transactionType: "$responseObject.type",
                transactionStatus: "$responseObject.status",
                merchantId: "$responseObject.merchid",
                currency: "$responseObject.currency",
                date: { $toDate: "$responseObject.date" },
                batchId: { $toString: { $ifNull: ["$responseObject.batchid", ""] } },
                paymentType: "card-connect",
                transactionDate: {
                    $switch: {
                        branches: [
                            // Case: 14 digits (YYYYMMDDHHmmss)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        14
                                    ]
                                },
                                then: {
                                    $dateFromString: {
                                        dateString: {
                                            $concat: [
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 0, 4] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 4, 2] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 6, 2] }, "T",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 8, 2] }, ":",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 10, 2] }, ":",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 12, 2] }, "Z"
                                            ]
                                        }
                                    }
                                }
                            },
                            // Case: 8 digits (YYYYMMDD)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        8
                                    ]
                                },
                                then: {
                                    $dateFromString: {
                                        dateString: {
                                            $concat: [
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 0, 4] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 4, 2] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 6, 2] }, "T00:00:00Z"
                                            ]
                                        }
                                    }
                                }
                            },
                            // Case: epoch seconds (10 digits)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        10
                                    ]
                                },
                                then: {
                                    $toDate: {
                                        $multiply: [{ $toLong: { $ifNull: ["$responseObject.authdate", 0] } }, 1000]
                                    }
                                }
                            },
                            // Case: epoch millis (13 digits)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        13
                                    ]
                                },
                                then: {
                                    $toDate: { $toLong: { $ifNull: ["$responseObject.authdate", 0] } }
                                }
                            }
                        ],
                        // Default: fallback to responseObject.date
                        default: { $toDate: "$responseObject.date" }
                    }
                },

            }
        },
        {
            $match: {
                transactionDate: {
                    $gte: fromDate,
                    $lte: toDate
                },

                ...(cardTransactionStatusArray.length > 0 && { transactionStatus: { $in: cardTransactionStatusArray } }),
                ...(customerDetailsArray.length > 0 && { customerByCard: { $in: customerDetailsArray } }),
                ...(batchNumberArray.length > 0 && { batchId: { $in: batchNumberArray } }),
                ...(cardTransactionTypesArray.length > 0 && { transactionType: { $in: cardTransactionTypesArray } }),

            }
        },
        { $sort: { transactionDate: -1 } },
        {
            $project: {
                // _id:1
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
    console.log("cardTransactionDetails===", (cardTransactionDetails.length))
    return cardTransactionDetails






}




exports.getSummaryDetails = async (returnDashboardFiltersSafeCash, returnDashboardFiltersCardConnect, machineSummaryDetails, cardConnectSummaryDetails) => {
    let summaryDetails = []
    if (!(Array.isArray(returnDashboardFiltersSafeCash))) {
        returnDashboardFiltersSafeCash = []
    }
    if (!(Array.isArray(returnDashboardFiltersCardConnect))) {
        returnDashboardFiltersCardConnect = []
    }

    if (returnDashboardFiltersCardConnect.length > 0) {
        let uniqueUsers = new Set();
        let uniqueBatches = new Set()
        for (let ccTransaction of returnDashboardFiltersCardConnect) {
            if ((ccTransaction?.transactionType).toLowerCase() === "sale" && (ccTransaction?.transactionStatus).toLowerCase() === "processed") {
                cardConnectSummaryDetails.totalAmount += ccTransaction?.amount
            }
            if ((ccTransaction?.transactionStatus).toLowerCase() === "processed") {
                cardConnectSummaryDetails.successfulTransactionsCount += 1
            } else if ((ccTransaction?.transactionStatus).toLowerCase() !== "processed") {
                cardConnectSummaryDetails.failureTransactionsCount += 1
            }
            if (ccTransaction?.amount < 0 && (ccTransaction?.transactionStatus).toLowerCase() === "processed") {
                cardConnectSummaryDetails.totalRefundedTransactionsCount += 1
                cardConnectSummaryDetails.totalRefundedAmount += Math.abs(ccTransaction.amount)
            }

            if (ccTransaction?.customerByCard) {
                uniqueUsers.add(ccTransaction?.customerByCard);
            }

            if (ccTransaction?.batchId) {
                uniqueBatches.add(ccTransaction?.batchId)
            }
        }


        cardConnectSummaryDetails.totalUsers = uniqueUsers.size
        cardConnectSummaryDetails.totalBatches = uniqueBatches.size
    }


    if (returnDashboardFiltersSafeCash.length > 0) {

        let uniqueMachines = new Set()
        let uniqueTransactionTypes = new Set()

        for (let machineTransaction of returnDashboardFiltersSafeCash) {
            machineSummaryDetails.totalAmount += parseInt(machineTransaction?.amount);

            if (machineTransaction?.transactionType) {
                uniqueTransactionTypes.add(machineTransaction?.transactionType);
            }

            if (machineTransaction?.serialNumber) {
                uniqueMachines.add(machineTransaction?.serialNumber);
            }


        }
        machineSummaryDetails.totalMachinesCount = uniqueMachines.size
        machineSummaryDetails.totalTransactionTypesCount = uniqueTransactionTypes.size


    }

    // console.log("machineSummaryDetails===", machineSummaryDetails)
    // console.log("cardConnectSummaryDetails===", cardConnectSummaryDetails)

    if (returnDashboardFiltersSafeCash.length > 0 && returnDashboardFiltersCardConnect.length > 0) {
        summaryDetails.push(machineSummaryDetails, cardConnectSummaryDetails)


    } else if (returnDashboardFiltersSafeCash.length === 0 && returnDashboardFiltersCardConnect.length > 0) {

        summaryDetails.push(cardConnectSummaryDetails)

    } else if (returnDashboardFiltersSafeCash.length > 0 && returnDashboardFiltersCardConnect.length === 0) {
        summaryDetails.push(machineSummaryDetails)

    }


    return summaryDetails

}