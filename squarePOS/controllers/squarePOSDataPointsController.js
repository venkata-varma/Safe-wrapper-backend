let squarePOSLocationsModel = require('../models/squarePOSLocationsModel')
let squarePOSCashDrawerShiftsModel = require('../models/squarePOSCashDrawerShiftsModel')
let squarePOSPaymentsModel = require('../models/squarePOSPaymentsSchema')
let squarePOSTeamMembersModel = require('../models/squarePOSTeamMembersModel')
let asyncWrapper = require('../middleware/asyncWrapper')
let { squarePOSPredefinedKeys } = require('../config/predefinedKeys')
let customConstants = require('../../config/constants.json')
let mongoose = require('mongoose')
let moment = require('moment')
let webhookPayloadHeadersModel = require('../../models/webhookPayloadHeaders')
let webhookPayloadTransactionsModel = require('../../models/webhookPayloadTransactions')
let webhookMetaPayloadModel = require('../../models/webHookMetaPayloads')
let squarePOSExceptionsModel = require('../models/squarePOSExceptionModel')



/**
 * "SquarePOS Reconciliation dashboard"
 * API to provide options for dropdowns in SquarePOS Reconciliation dashboard
 */


exports.getSquarePosPayloadHeaders = asyncWrapper(async (req, res) => {
    let accountId = req.params.accountId
    let [getAllLocations, webhookPayloadHeadersData] = await Promise.all([
        squarePOSLocationsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId)
                }
            },
            {
                $group: {
                    _id: "$referenceId",
                    name: { $first: "$responseObject.name" },
                    address: { $first: "$responseObject.address" },
                    timezone: { $first: "$responseObject.timezone" },

                }
            },
            {
                $project: {
                    _id: 0,
                    locationId: "$_id",
                    name: 1,
                    address: 1,
                    timezone: 1
                }
            }

        ]),
        webhookPayloadHeadersModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId)
                }
            },
            {
                $facet: {
                    serialNumbers: [
                        { $group: { _id: null, serialNumbers: { $addToSet: "$serialNumber" } } },
                        { $project: { _id: 0, serialNumbers: 1 } }
                    ],

                }
            },

        ])
    ])


    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: "",
        data: {
            getAllLocations,
            cashDrawerShiftStatuses: squarePOSPredefinedKeys?.cashDrawerShiftsStatuses,
            cardPaymentStatuses: squarePOSPredefinedKeys?.cardPaymentStatuses,
            serialNumbers: webhookPayloadHeadersData[0]?.serialNumbers?.[0]?.serialNumbers,
            transactionTypes: ["CARD", "CASH-DRAWER"],
        }
    })



})

/**
 * "SquarePOS Reconciliation dashboard"
 * API for providing statistics related to reconciliation between Square-pos and CIMA-Machine
 */

exports.getSquarePOSShiftTransactionsReconcilation = asyncWrapper(async (req, res) => {

    let { fromDate, toDate, shiftStatus, location, transactionType, serialNumbers } = req.body;
    const accountId = req.params.accountId;

    transactionType = (transactionType || "").trim();

    // ---------------- VALIDATIONS ----------------
    if (transactionType !== "CASH-DRAWER" && transactionType !== "CARD") {
        throw new Error("Transaction type must be either 'Cash-drawer' or 'Card'");
    }

    if (!fromDate || !toDate) {
        throw new Error("fromDate and toDate are mandatory");
    }

    fromDate = new Date(moment(fromDate).format('YYYY-MM-DDTHH:mm:ss'));
    toDate = new Date(moment(toDate).format('YYYY-MM-DDTHH:mm:ss'));

    // ---------------- COMMON FILTERS ----------------
    const locationArray = (!location || location.toLowerCase() === "all")
        ? null
        : location.split(",").map(l => l.trim());

    const statusArray = (!shiftStatus || shiftStatus.toLowerCase() === "all")
        ? null
        : shiftStatus.split(",").map(s => s.trim());

    // =====================================================
    // =============== CASH DRAWER SHIFTS ==================
    // =====================================================
    if (transactionType === "CASH-DRAWER") {

        if (!serialNumbers) {
            throw new Error("Serial number is mandatory for cash drawer shifts.");
        }

        const serialNumberArray = serialNumbers.split(",");

        if (serialNumberArray.length > 1) {
            throw new Error("Only one serial number can be selected at a time.");
        }

        let shiftAndLocationCondition = {};

        if (statusArray) {
            shiftAndLocationCondition["responseObject.state"] = { $in: statusArray };
        }

        if (locationArray) {
            shiftAndLocationCondition["locationId"] = { $in: locationArray };
        }

        // ---------------- FETCH SHIFTS ----------------


        let shiftsTransactions = await squarePOSCashDrawerShiftsModel.aggregate([
            {
                $match: { accountId: new mongoose.Types.ObjectId(accountId) }
            },
            {
                $addFields: {
                    openedAtDate: { $dateFromString: { dateString: "$responseObject.opened_at" } },
                    closedAtDate: { $dateFromString: { dateString: "$responseObject.closed_at" } },
                    depositedAmountInMachine: 0,
                    variance: 0,
                    reconcilationStatus: null,
                    depositedAmountInMachineCurrency: "$responseObject.closed_cash_money.currency"
                }
            },
            {
                $match: {
                    openedAtDate: { $gte: fromDate, $lte: toDate },
                    ...shiftAndLocationCondition
                }
            },
            {
                $project: {
                    _id: 1,
                    referenceId: 1,
                    accountId: 1,
                    locationId: 1,
                    currency: "$responseObject.expected_cash_money.currency",
                    openedAtDate: 1,
                    closedAtDate: 1,
                    status: "$responseObject.state",
                    expectedAmount: "$responseObject.expected_cash_money",
                    receivedAmount: "$responseObject.closed_cash_money",
                    teamMember: { $arrayElemAt: ["$teamMembers", 0] },
                    depositedAmountInMachine: 1,
                    depositedAmountInMachineCurrency: 1,
                    variance: 1,
                    reconcilationStatus: 1
                }
            },
            {
                $sort: { closedAtDate: 1 }
            },
            {
                $facet: {
                    // cashDrawerShiftRecords: [
                    //     { $sort: { closedAtDate: 1 } }
                    // ]
                    cashDrawerShiftRecords: []
                }
            }
        ])
        let machineTransactions = await webhookMetaPayloadModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId),
                    primaryHookId: { $in: serialNumberArray }
                }
            },
            {
                $addFields: {
                    transactionDateTime: {
                        $toDate: {
                            $arrayElemAt: ["$dataPoint.Transactions.TransactionDateTime", -1]
                        }
                    }
                }
            },
            {
                $match: {
                    transactionDateTime: { $gte: fromDate, $lte: toDate }
                }
            },
            { $sort: { transactionDateTime: 1 } },
            {
                $addFields: {
                    totalDepositAmount: {
                        $sum: {
                            $map: {
                                input: "$dataPoint.Transactions",
                                as: "txn",
                                in: { $ifNull: ["$$txn.Amount", 0] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    dataPoint: 0
                }
            }
        ])
        let cashDrawerShiftRecords = shiftsTransactions[0]?.cashDrawerShiftRecords
        // ---------------- RECONCILIATION LOGIC ----------------
        let totalDeposits = 0;
        let outOfBalanceCount = 0;
        let stats = { ok: 0, warning: 0, alert: 0, netVariance: 0, currency: "USD" };


        if (cashDrawerShiftRecords.length > 0 && machineTransactions.length > 0) {

            // depositedAmountInMachine is already initialized in your aggregate as 0

            let shiftIndex = 0;

            for (const mxTxn of machineTransactions) {

                // Move pointer to latest closed shift before this transaction
                while (
                    shiftIndex + 1 < cashDrawerShiftRecords.length &&
                    cashDrawerShiftRecords[shiftIndex + 1].closedAtDate <= mxTxn.transactionDateTime
                ) {
                    shiftIndex++;
                }

                // Assign deposit to matched shift
                if (
                    cashDrawerShiftRecords[shiftIndex] &&
                    cashDrawerShiftRecords[shiftIndex]?.closedAtDate <= mxTxn?.transactionDateTime &&
                    cashDrawerShiftRecords[shiftIndex]?.receivedAmount?.amount === mxTxn?.totalDepositAmount
                ) {
                    console.log("cashDrawerShiftRecords[shiftIndex]===", cashDrawerShiftRecords[shiftIndex])
                    cashDrawerShiftRecords[shiftIndex].depositedAmountInMachine = mxTxn?.totalDepositAmount;
                    cashDrawerShiftRecords[shiftIndex].variance = cashDrawerShiftRecords[shiftIndex]?.expectedAmount?.amount - cashDrawerShiftRecords[shiftIndex]?.depositedAmountInMachine;
                    stats.netVariance = stats.netVariance + cashDrawerShiftRecords[shiftIndex].variance

                    if (cashDrawerShiftRecords[shiftIndex].variance === 0) {
                        cashDrawerShiftRecords[shiftIndex].reconcilationStatus = "OK"

                        stats.ok = stats.ok + 1
                    }
                    else if (cashDrawerShiftRecords[shiftIndex].variance < 500) {
                        cashDrawerShiftRecords[shiftIndex].reconcilationStatus = "WARNING"
                        stats.warning = stats.warning + 1
                    } else if (cashDrawerShiftRecords[shiftIndex].variance >= 500) {
                        cashDrawerShiftRecords[shiftIndex].reconcilationStatus = "ALERT"
                        stats.alert = stats.alert + 1
                    }


                }
            }
        }

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_SQUARE_POS_CASH_DRAWER_RECONCILATION,
            data: {
                cashDrawerShiftRecords: cashDrawerShiftRecords,
                stats,
                totalDeposits,
                outOfBalanceCount,
                machineTransactions
            }
        });
    }

    // =====================================================
    // ================= CARD PAYMENTS =====================
    // =====================================================
    if (transactionType === "CARD") {

        let paymentMatchCondition = {

        };

        if (locationArray) {
            paymentMatchCondition["locationId"] = { $in: locationArray };
        }

        if (statusArray) {
            paymentMatchCondition["status"] = { $in: statusArray };
        }

        const cardPayments = await squarePOSPaymentsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId)
                }

            },
            {
                $addFields: {
                    paymentId: "$responseObject.id",
                    locationId: "$responseObject.location_id",
                    paymentDate: {
                        $dateFromString: { dateString: "$responseObject.created_at" }
                    },
                    amount: "$responseObject.amount_money",
                    status: "$responseObject.status",
                    order_id: "$responseObject.order_id",
                    team_member_id: "$responseObject.team_member_id",
                    paymentSource: "$responseObject.source_type",
                    receiptUrl: "$responseObject.receipt_url",

                }
            },
            {
                $project: {
                    responseObject: 0
                }
            },
            {
                $match: {
                    paymentDate: {
                        $gte: fromDate,
                        $lte: toDate
                    },
                    paymentSource: "CARD",
                    ...paymentMatchCondition
                }
            },



        ]);

        const totalDeposits = cardPayments.reduce((sum, p) => sum + (p?.amount?.amount || 0), 0);

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: "Square POS Card Payments fetched successfully",
            data: {
                cardPaymentRecords: cardPayments,
                totalDeposits,
                outOfBalanceCount: 0,
                count: cardPayments.length
            }
        });
    }

});


/**
 * Function that is useful for   Menu --->  "Exceptions"
 * @param {*} accountId 
 * @param {*} fromDate 
 * @param {*} toDate 
 * @param {*} paymentType 
 * @returns 
 */
exports.getSquarePOSExceptions = async (accountId, fromDate, toDate, paymentType) => {
    let matchCondition = {}

    if (accountId) {
        matchCondition["accountId"] = new mongoose.Types.ObjectId(accountId)
    } else {
        matchCondition = {}
    }
    let getExceptions = await squarePOSExceptionsModel.aggregate([
        {
            $match: matchCondition
        },
        {
            $addFields: {
                paymentType: paymentType
            }
        },
        {
            $match: {
                createdAt: {
                    $gte: fromDate,
                    $lte: toDate
                }
            }
        },

        {
            $sort: {
                createdAt: -1
            }
        },
    ])

    return getExceptions
}