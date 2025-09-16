
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


    const matchRange = cashTransactionRange.match(/-?\d+/g);
    let fromRange = parseInt(matchRange[0]);
    let toRange = parseInt(matchRange[1]);

    console.log("fromRange,toRange", fromRange, toRange)

    var userNamesArray = []
    if (userNames) {
        userNamesArray = userNames.includes(',')
            ? userNames.split(',').map((s) => s.trim())
            : [userNames];


    }


    let matchConditions = {
        transactionDate: {
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
                transactionDate: { $toDate: "$transactionDateTime" },
                category: "cima-machine"
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



exports.dashboardFiltersCardConnect = async (cardTransactionTypes, cardTransactionStatus, allMerchantIds, customerDetails, batchNumber, fromDate, toDate, cardTransactionRange) => {

    if (!fromDate || !toDate) {
        throw new Error(' From date, and To date are required');
    }

    if (!moment(fromDate).isValid() || !moment(toDate).isValid()) {
        throw new Error('Invalid date format for fromDate or toDate');
    }
    fromDate = moment.utc(fromDate).startOf("day").toDate();
    toDate = moment.utc(toDate).endOf("day").toDate()

    const matchRange = cardTransactionRange.match(/-?\d+/g);
    let fromRange = parseInt(matchRange[0]);
    let toRange = parseInt(matchRange[1]);

    console.log("fromRange, toRange===", fromRange, toRange)
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



    //----------------------__End of tuning requirements and start of aggregate----------------
    const cardTransactionDetails = await cardConnectTransactionsModel.aggregate([
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
                category: "card-connect",
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
                amount: {
                    $gte: fromRange,    // Both are $lte because as Negative numbers might be involved 
                    $lte: toRange
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