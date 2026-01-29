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
                $group: {
                    _id: null,
                    serialNumbers: { $addToSet: "$serialNumber" }
                }
            },
            {
                $project: {
                    _id: 0,
                    serialNumbers: 1
                }
            }
            // {
            //     $facet: {
            //         serialNumbers: [
            //             { $group: { _id: null, serialNumbers: { $addToSet: "$serialNumber" } } },
            //             { $project: { _id: 0, serialNumbers: 1 } }
            //         ],
            //         transactionTypes: [
            //             { $group: { _id: null, transactionTypes: { $addToSet: "$transactionType" } } },
            //             { $project: { _id: 0, transactionTypes: 1 } }
            //         ]
            //     }
            // },

        ])
    ])


    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: "",
        data: {
            getAllLocations,
            cashDrawerShiftStatuses: squarePOSPredefinedKeys?.cashDrawerShiftsStatuses,
            paymentStatuses: squarePOSPredefinedKeys?.paymentStatuses,
            serialNumbers: webhookPayloadHeadersData[0]?.serialNumbers?.[0]?.serialNumbers,
            transactionTypes: ["cardPayments", "cashDrawerShifts"],
        }
    })



})

/**
 * "SquarePOS Reconciliation dashboard"
 * API for providing statistics related to reconciliation between Square-pos and CIMA-Machine
 */

exports.getSquarePOSShiftTransactionsReconcilation = asyncWrapper(async (req, res) => {

    let { fromDate, toDate, shiftStatus, location, TransactionTypes, serialNumbers } = req.body;
    const accountId = req.params.accountId;

    TransactionTypes = (TransactionTypes || "").toLowerCase().trim();

    // ---------------- VALIDATIONS ----------------
    if (!["cashdrawershifts", "cardpayments"].includes(TransactionTypes)) {
        throw new Error("TransactionTypes must be either 'cashdrawershifts' or 'cardpayments'");
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
    if (TransactionTypes === "cashdrawershifts") {

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
        const shiftsTransactions = await squarePOSCashDrawerShiftsModel.aggregate([
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
                    responseObject: 1,
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
            }
        ]);

        // ---------------- FETCH MACHINE TRANSACTIONS ----------------
        const machineTransactions = await webhookMetaPayloadModel.aggregate([
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
        ]);

        // ---------------- RECONCILIATION LOGIC ----------------
        let totalDeposits = 0;
        let outOfBalanceCount = 0;
        let stats = { ok: 0, warning: 0, alert: 0, netVariance: 0, currency: "USD" };

        let shiftIndex = 0;

        for (const mxTxn of machineTransactions) {

            while (
                shiftIndex + 1 < shiftsTransactions.length &&
                shiftsTransactions[shiftIndex + 1].closedAtDate <= mxTxn.transactionDateTime
            ) {
                shiftIndex++;
            }

            const currentShift = shiftsTransactions[shiftIndex];

            if (
                currentShift &&
                currentShift.closedAtDate <= mxTxn.transactionDateTime &&
                currentShift.receivedAmount?.amount === mxTxn.totalDepositAmount
            ) {
                currentShift.depositedAmountInMachine = mxTxn.totalDepositAmount;
                currentShift.variance =
                    currentShift.expectedAmount.amount - currentShift.depositedAmountInMachine;

                totalDeposits += currentShift.depositedAmountInMachine;
                stats.netVariance += currentShift.variance;

                if (currentShift.variance === 0) {
                    currentShift.reconcilationStatus = "OK";
                    stats.ok++;
                } else {
                    outOfBalanceCount++;
                    if (currentShift.variance < 500) {
                        currentShift.reconcilationStatus = "ALERT";
                        stats.alert++;
                    } else {
                        currentShift.reconcilationStatus = "WARNING";
                        stats.warning++;
                    }
                }
            }
        }

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_SQUARE_POS_CASH_DRAWER_RECONCILATION,
            data: {
                cashDrawerShiftRecords: shiftsTransactions,
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
    if (TransactionTypes === "cardpayments") {

        let paymentMatchCondition = {
            accountId: new mongoose.Types.ObjectId(accountId),
            "responseObject.source_type": "CARD",
            createdAt: { $gte: fromDate, $lte: toDate }
        };

        if (locationArray) {
            paymentMatchCondition["responseObject.location_id"] = { $in: locationArray };
        }

        if (statusArray) {
            paymentMatchCondition["responseObject.status"] = { $in: statusArray };
        }

        const payments = await squarePOSPaymentsModel.aggregate([
            { $match: paymentMatchCondition },
            {
                $project: {
                    _id: 1,
                    referenceId: 1,
                    locationId: "$responseObject.location_id",
                    status: "$responseObject.status",
                    amount: "$responseObject.amount_money.amount",
                    currency: "$responseObject.amount_money.currency",
                    sourceType: "$responseObject.source_type",
                    createdAt: 1,
                    responseObject: 1
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        const totalDeposits = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: "Square POS Card Payments fetched successfully",
            data: {
                paymentRecords: payments,
                totalDeposits,
                outOfBalanceCount: 0,
                count: payments.length
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