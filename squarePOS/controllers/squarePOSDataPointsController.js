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
                    transactionTypes: [
                        { $group: { _id: null, transactionTypes: { $addToSet: "$transactionType" } } },
                        { $project: { _id: 0, transactionTypes: 1 } }
                    ]
                }
            },

        ])
    ])


    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: "",
        data: {
            getAllLocations,
            shiftStatuses: squarePOSPredefinedKeys?.cashDrawerShiftsStatuses,
            serialNumbers: webhookPayloadHeadersData[0]?.serialNumbers?.[0]?.serialNumbers,
            transactionTypes: webhookPayloadHeadersData[0]?.transactionTypes?.[0]?.transactionTypes,
        }
    })



})

/**
 * "SquarePOS Reconciliation dashboard"
 * API for providing statistics related to reconciliation between Square-pos and CIMA-Machine
 */

exports.getSquarePOSShiftTransactionsReconcilation = asyncWrapper(async (req, res) => {
    let { fromDate, toDate, shiftStatus, location, machineTransactionTypes, serialNumbers } = req.body
    let accountId = req.params.accountId
    // console.log("req.body", req.body)

    serialNumbers = serialNumbers.split(',')

    if (serialNumbers && serialNumbers.length > 1) {
        throw new Error("Only one serial number can be selected at a time.")
    }
    if (!fromDate || !toDate) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: "fromDate and toDate are mandatory"
        });
    }

    fromDate = new Date(moment(fromDate).format('YYYY-MM-DDTHH:mm:ss'))
    toDate = new Date(moment(toDate).format('YYYY-MM-DDTHH:mm:ss'))


    // -------- Parse filters --------
    const shiftStatusArray = (!shiftStatus || (shiftStatus).toLowerCase() === "all")
        ? null
        : shiftStatus.split(",").map(s => s.trim());

    const locationArray = (!location || (location).toLowerCase() === "all")
        ? null
        : location.split(",").map(l => l.trim());

    let machineTransactionTypesArray = (!machineTransactionTypes || (machineTransactionTypes).toLowerCase() === "all") ?
        null : machineTransactionTypes.split(',').map((t) => t.trim())


    // console.log("shiftStatusArray===locationArray", fromDate, toDate, shiftStatusArray, locationArray)
    let shiftAndLocationCondition = {}
    if (shiftStatusArray) {
        shiftAndLocationCondition["responseObject.state"] = { $in: shiftStatusArray };
    }

    if (locationArray) {
        shiftAndLocationCondition["locationId"] = { $in: locationArray };
    }



    let shiftsTransactions = await squarePOSCashDrawerShiftsModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId)
            }

        },
        {
            $addFields: {
                openedAtDate: {
                    $dateFromString: {
                        dateString: "$responseObject.opened_at"
                    }
                },
                closedAtDate: {
                    $dateFromString: {
                        dateString: "$responseObject.closed_at"
                    }
                }
            }
        },

        {
            $match: {
                openedAtDate: {
                    $gte: fromDate,
                    $lte: toDate
                },
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
                teamMember: {
                    $arrayElemAt: ["$teamMembers", 0]
                }

            }
        },
        {
            $addFields: {
                variance: {
                    $subtract: [
                        "$expectedAmount.amount",
                        "$receivedAmount.amount"
                    ]
                }
            }
        },
        {
            $addFields: {
                reconciliationStatus: {
                    $switch: {
                        branches: [
                            {
                                case: { $eq: ["$variance", 0] },
                                then: "OK"
                            },
                            {
                                case: {
                                    $lte: [{ $abs: "$variance" }, 500]
                                },
                                then: "WARNING"
                            }
                        ],
                        default: "ALERT"
                    }
                }
            }
        },
        //Below functionalties are meant or might not meant to be written seperately in functions for readability. As of now, stciking with aggregate to reduce loops
        {
            $facet: {
                cashDrawerShiftRecords: [
                    { $sort: { openedAtDate: -1 } }
                ],
                stats: [
                    {
                        $group: {
                            _id: null,
                            ok: {
                                $sum: { $cond: [{ $eq: ["$reconciliationStatus", "OK"] }, 1, 0] }
                            },
                            warning: {
                                $sum: { $cond: [{ $eq: ["$reconciliationStatus", "WARNING"] }, 1, 0] }
                            },
                            alert: {
                                $sum: { $cond: [{ $eq: ["$reconciliationStatus", "ALERT"] }, 1, 0] }
                            },
                            netVariance: { $sum: "$variance" },
                            currency: { $first: "$currency" }
                        }
                    }
                ]
            }
        }



    ])

    //-------------------------------------------
    let transactionTypeCondition = {};


    if (machineTransactionTypesArray) {
        transactionTypeCondition["dataPoint.Transactions"] = {
            $elemMatch: {
                TransactionType: { $in: machineTransactionTypesArray }
            }
        };
    }
    let machineTransactions = await webhookMetaPayloadModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId),

                primaryHookId: { $in: serialNumbers }
            }
        },

        {
            $addFields: {
                transactionDateTime: {
                    $toDate: {
                        $arrayElemAt: [
                            "$dataPoint.Transactions.TransactionDateTime",
                            -1
                        ]
                    }
                },
                filteredTransactions: {
                    $cond: {
                        if: { $eq: [machineTransactionTypesArray, null] },
                        then: "$dataPoint.Transactions",
                        else: {
                            $filter: {
                                input: "$dataPoint.Transactions",
                                as: "txn",
                                cond: {
                                    $in: ["$$txn.TransactionType", machineTransactionTypesArray]
                                }
                            }
                        }
                    }
                },
                //Below line could be added if necessary
                // metaData: "$dataPoint.Metadata"
            }
        },
        {
            $match: {
                transactionDateTime: {
                    $gte: fromDate,
                    $lte: toDate
                },

            }
        },

        {
            $addFields: {
                totalDepositAmount: {
                    $sum: {
                        $map: {
                            input: "$filteredTransactions",
                            as: "txn",
                            in: { $ifNull: ["$$txn.Amount", 0] }
                        }
                    }
                }
            }
        },
        {
            $project: {
                dataPoint: 0,
                filteredTransactions: 0
            }
        },

    ])


    console.log("shiftsTransactions===", shiftsTransactions.length)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: "",
        data: {
            cashDrawerShiftRecords: shiftsTransactions[0]?.cashDrawerShiftRecords,
            stats: shiftsTransactions[0]?.stats[0] || {
                "ok": 0,
                "warning": 0,
                "alert": 0,
                "netVariance": 0,
                "currency": "USD"
            },
            machineTransactions
        }
    })

})



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