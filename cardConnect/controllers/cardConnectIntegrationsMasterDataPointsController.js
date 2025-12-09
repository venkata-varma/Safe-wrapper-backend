const asyncWrapper = require('../middleware/asyncWrapper');
const mongoose = require('mongoose')
let moment = require('moment')
const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
const cardConnectIntegrationsAPIUrlsFlowModel = require('../models/cardConnectIntegrationsAPIUrlFlowModel')

const cardConnectTransactionsModel = require('../models/cardConnectTransactionsModel')
const cardConnectIntegrationsCronsModel = require('../models/cardConnectIntegrationsCronsModel')
const cardConnectTransactionLifeCycleModel = require('../models/cardConnectTransactionLifeCycle')
const cardConnectExceptionsModel = require('../models/cardConnectExceptionsModel')
const customConstants = require('../../config/constants.json');
const { statusMappings, getProcessedDisplayPoints, transactionTypeMappings } = require('../utils/helpers');
const accountsModel = require('../../models/accountsModel');
let { cardConnectPredefinedKeys } = require('../config/predefinedKeys');
const { getSixWeeksSalesFunction } = require('../../utils/sixWeeksTimeline');


/**
 * 
 */
exports.getMerchantsNamesInDropdown = asyncWrapper(async (req, res, next) => {

    let merchantNames;
    if (req.user.accountId.accountType === 'super-admin') {

        merchantNames = await accountsModel.aggregate([
            {
                $match: {
                    status: "active",

                    accountName: { $nin: ["", null] },
                    $expr: { $eq: [{ $type: "$accountName" }, "string"] }
                }
            },

            {
                $group: {
                    _id: "$_id",                // group by unique record id
                    merchantName: { $first: "$accountName" }
                }
            },
            {
                $project: {
                    _id: 0,
                    objectId: "$_id",           // keep original _id as objectId
                    merchantName: 1
                }
            }
        ])
    } else if (req.user.accountId.accountType === 'merchant') {

        let accountDetails = req.user.accountId   //(Populated object)
        merchantNames = [{
            merchantName: accountDetails?.accountName,
            objectId: accountDetails?._id
        }];
    }

    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MERCHANT_MERCHANT_NAMES_IN_DROPDOWN,
            data: {

                merchantNames
            },
        });





})


exports.getSingleIntegrationView = asyncWrapper(async (req, res) => {
    const { accountId } = req.params
    let findExistenseOfCardConnectIntegration;
    let data;

    let findIntegrationWithCardConnectCredentials = await cardconnectIntegrationsCredentialsModel.findOne({ accountId: new mongoose.Types.ObjectId(accountId) })
    let findIntegrationWithCardConnectSettings = await cardConnectIntegrationsSettingsModel.findOne({ accountId: new mongoose.Types.ObjectId(accountId) })
    if (findIntegrationWithCardConnectCredentials && findIntegrationWithCardConnectSettings) {
        findExistenseOfCardConnectIntegration = true
    } else if (!(findIntegrationWithCardConnectCredentials && findIntegrationWithCardConnectSettings)) {
        findExistenseOfCardConnectIntegration = false
    }
    if (findExistenseOfCardConnectIntegration === false) {
        data = {
            findExistenseOfCardConnectIntegration: findExistenseOfCardConnectIntegration
        }
    } else {

        let [integrationsMasterDetails, summaryGrid, statusGroupBy, transactionTypesGroup] = await Promise.all([

            accountsModel.aggregate([
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(accountId)
                    }
                },
                // {
                //     $lookup: {
                //         from: "cardconnectintegrationscredentials",
                //         localField: "_id",
                //         foreignField: "accountId",
                //         as: "cardconnectintegrationscredentials"
                //     }
                // },
                // {
                //     $lookup: {
                //         from: "cardconnectintegrationsapiurlflows",
                //         localField: "_id",
                //         foreignField: "accountId",
                //         as: "cardconnectintegrationsapiurlflows"
                //     }
                // },
                {
                    $lookup: {
                        from: "cardconnectintegrationssettings",
                        localField: "_id",
                        foreignField: "accountId",
                        as: "cardconnectintegrationssettings"
                    }
                },
                // { $unwind: "$cardconnectintegrationscredentials" },
                // { $unwind: "$cardconnectintegrationsapiurlflows" },
                { $unwind: "$cardconnectintegrationssettings" }

            ]),

            cardConnectTransactionsModel.aggregate([
                {
                    $match: {
                        accountId: new mongoose.Types.ObjectId(accountId),
                    },
                },
                {
                    $addFields: {
                        batchId: "$responseObject.batchid",
                        transactionStatus: "$responseObject.status",
                        transactionType: "$responseObject.type",
                        amount: { $toDouble: "$responseObject.amount" },
                        cardNumber: "$customerDetails.cardNumber",
                        cardBrand: "$customerDetails.cardBrand",
                        cardType: "$customerDetails.cardType",
                    },
                },

                {
                    $group: {
                        _id: null,

                        // transaction counts
                        totalTransactionsCount: { $sum: 1 },

                        settledTransactionsCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$transactionStatus", "Processed"] },
                                            { $eq: ["$transactionType", "SALE"] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },

                        settledAmount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$transactionStatus", "Processed"] },
                                            { $eq: ["$transactionType", "SALE"] }
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        },

                        refundedTransactionsCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$transactionStatus", "Processed"] },
                                            { $eq: ["$transactionType", "REFUND"] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },

                        refundedAmount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$transactionStatus", "Processed"] },
                                            { $eq: ["$transactionType", "REFUND"] }
                                        ]
                                    },
                                    { $abs: "$amount" },
                                    0
                                ]
                            }
                        },

                        // distinct batch count
                        batchesCount: { $addToSet: "$batchId" },

                        // distinct customer count based on 3 fields
                        customersSet: {
                            $addToSet: {
                                cardNumber: "$cardNumber",
                                cardBrand: "$cardBrand",
                                cardType: "$cardType"
                            }
                        },

                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalTransactionsCount: 1,
                        settledTransactionsCount: 1,
                        settledAmount: 1,
                        refundedTransactionsCount: 1,
                        refundedAmount: 1,
                        batchesCount: { $size: "$batchesCount" },
                        customersCount: { $size: "$customersSet" },

                    }
                }
            ]),
            cardConnectTransactionsModel.aggregate([
                {
                    $match: {
                        accountId: new mongoose.Types.ObjectId(accountId),
                    },
                },
                {
                    $addFields: {
                        transactionStatus: "$responseObject.status"
                    }
                },
                {
                    $project: {
                        responseObject: 0
                    }
                },
                {
                    $group: {
                        _id: "$transactionStatus",
                        count: { $sum: 1 }

                    }
                },

            ]),
            cardConnectTransactionsModel.aggregate([
                {
                    $match: {
                        accountId: new mongoose.Types.ObjectId(accountId),
                    },
                },
                {
                    $addFields: {
                        transactionType: "$responseObject.type"
                    }
                },
                {
                    $project: {
                        responseObject: 0
                    }
                },
                {
                    $group: {
                        _id: "$transactionType",
                        count: { $sum: 1 }

                    }
                },

            ])



        ])
        let possibleTransactionStatusKeys = integrationsMasterDetails[0]?.cardconnectintegrationssettings?.transactionStatusKeys
        let possibleTransactionTypeKeys = integrationsMasterDetails[0]?.cardconnectintegrationssettings?.transactionTypeKeys



        let getStatusMappings = await statusMappings(statusGroupBy, possibleTransactionStatusKeys);


        let getTransactionTypeMappings = await transactionTypeMappings(transactionTypesGroup, possibleTransactionTypeKeys);




        summaryGrid = summaryGrid[0] ? summaryGrid[0] : {
            totalTransactionsCount: 0,
            settledTransactionsCount: 0,
            settledAmount: 0,
            refundedTransactionsCount: 0,
            refundedAmount: 0,
            batchesCount: 0,
            customersCount: 0,
            totalExceptionsCount: 0
        }
        integrationsMasterDetails[0].merchantId = findIntegrationWithCardConnectCredentials?.primaryKeyValues?.merchantId
        data = {
            findExistenseOfCardConnectIntegration,
            integrationDetails: integrationsMasterDetails[0],
            getTransactionTypeMappings: getTransactionTypeMappings,
            summaryGrid,
            getStatusMappings: getStatusMappings

        }

    }






    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_SINGLE_INTEGRATION_VIEW_DETAILS,
            data: data
        });





})



exports.getSingleIntegrationLoadedData = asyncWrapper(async (req, res) => {
    const { accountId } = req.params
    let { fromDate, toDate, type } = req.query
    let data;

    if (!fromDate || !toDate) {
        throw new Error(' From date, and To date are required');
    }

    if (!moment(fromDate).isValid() || !moment(toDate).isValid()) {
        throw new Error('Invalid date format for fromDate or toDate');
    }
    fromDate = new Date(moment(fromDate).format('YYYY-MM-DDTHH:mm:ss'))
    toDate = new Date(moment(toDate).format('YYYY-MM-DDTHH:mm:ss'))



    if (type === "exceptions") {
        data = await cardConnectExceptionsModel.find({ accountId, createdAt: { $gte: fromDate, $lte: toDate } }).sort({ createdAt: -1 })
    } else if (type === "transactions") {
        data = await cardConnectTransactionsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId),

                }
            },

            {
                $addFields: {
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
                    transactionId: "$responseObject.retref",
                    currency: "$responseObject.currency",
                    transactionStatus: "$responseObject.status",
                    batchId: "$responseObject.batchid",
                    amount: { $toDouble: "$responseObject.amount" },
                    transactionType: "$responseObject.type",
                    customerDetails: "$responseObject.customerDetails"
                }
            },
            {
                $project: {
                    responseObject: 0
                }
            },
            {
                $match: {
                    transactionDate: {
                        $gte: fromDate,
                        $lte: toDate
                    }
                }
            },
            {
                $sort: {
                    transactionDate: -1
                }
            }
        ])

    } else if (type === "activity-logs") {
        data = await cardConnectIntegrationsCronsModel.find({ accountId, createdAt: { $gte: fromDate, $lte: toDate } }).sort({ createdAt: -1 })

    }



    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_SINGLE_INTEGRATION_VIEW_DETAILS,
            data: {
                type: type,
                responseCount: data?.length,
                response: data
            }
        });



})

/**
 * API end-point's function
 * Function to give details related to Cron job.
 * It will return important statistics such stored transactions , exceptions, few insights
 */
exports.getDetailsOfCronJobId = asyncWrapper(async (req, res) => {
    let { cronJobId, accountId } = req.params
    let [getCronJobDetails, getTransactionsOfCron, getExceptionsOfCron, statisticsOfCron] = await Promise.all([
        await cardConnectIntegrationsCronsModel.findById(cronJobId),



        cardConnectTransactionsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId),
                    $or: [
                        { cardConnectIntegrationsCronIdCreate: new mongoose.Types.ObjectId(cronJobId) },
                        { cardConnectIntegrationsCronIdUpdate: new mongoose.Types.ObjectId(cronJobId) }
                    ]
                }
            },

            {
                $addFields: {
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
                    transactionId: "$responseObject.retref",
                    currency: "$responseObject.currency",
                    transactionStatus: "$responseObject.status",
                    batchId: "$responseObject.batchid",
                    amount: { $toDouble: "$responseObject.amount" },
                    transactionType: "$responseObject.type"
                }
            },
            {
                $project: {
                    responseObject: 0
                }
            },
            {
                $sort: {
                    transactionDate: -1
                }
            }
        ]),

        cardConnectExceptionsModel.find({
            cardConnectIntegrationsCronId: new mongoose.Types.ObjectId(cronJobId)
        }).sort({ createdAt: -1 }),

        cardConnectTransactionsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId),
                    $or: [
                        { cardConnectIntegrationsCronIdCreate: new mongoose.Types.ObjectId(cronJobId) },
                        { cardConnectIntegrationsCronIdUpdate: new mongoose.Types.ObjectId(cronJobId) }
                    ]
                }
            },
            {
                $addFields: {
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
                    transactionId: "$responseObject.retref",
                    currency: "$responseObject.currency",
                    transactionStatus: "$responseObject.status",
                    batchId: "$responseObject.batchid",
                    amount: { $toDouble: "$responseObject.amount" },
                    transactionType: "$responseObject.type"
                }
            },
            {
                $project: {
                    responseObject: 0
                }
            },
            {
                $sort: {
                    transactionDate: -1
                }
            },
            {
                $group: {
                    _id: null,

                    // transaction counts
                    totalTransactionsCount: { $sum: 1 },

                    settledTransactionsCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "SALE"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },

                    settledAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "SALE"] }
                                    ]
                                },
                                "$amount",
                                0
                            ]
                        }
                    },

                    refundedTransactionsCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "REFUND"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },

                    refundedAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "REFUND"] }
                                    ]
                                },
                                { $abs: "$amount" },
                                0
                            ]
                        }
                    },

                    // distinct batch count
                    batchesCount: { $addToSet: "$batchId" },

                    // distinct customer count based on 3 fields
                    customersSet: {
                        $addToSet: {
                            cardNumber: "$cardNumber",
                            cardBrand: "$cardBrand",
                            cardType: "$cardType"
                        }
                    },

                }
            },
            {
                $project: {
                    _id: 0,
                    totalTransactionsCount: 1,
                    settledTransactionsCount: 1,
                    settledAmount: 1,
                    refundedTransactionsCount: 1,
                    refundedAmount: 1,
                    batchesCount: { $size: "$batchesCount" },
                    customersCount: { $size: "$customersSet" },

                }
            }
        ])


    ])

    if (statisticsOfCron.length > 0) {
        statisticsOfCron[0].totalExceptionsCount = getExceptionsOfCron.length
    }

    summaryGrid = statisticsOfCron.length > 0 ? statisticsOfCron[0] : {
        statement: "Below are statistics related to newly stored / updated transactions of this particular activity. ",
        totalTransactionsCount: 0,
        settledTransactionsCount: 0,
        settledAmount: 0,
        refundedTransactionsCount: 0,
        refundedAmount: 0,
        batchesCount: 0,
        customersCount: 0,
        totalExceptionsCount: 0
    }

    let getDetalsOfCron = {
        ...getCronJobDetails,
        totalFetchedTransactionsCount: getCronJobDetails?.pulledCount,
        newlyAddedTransactionsCount: getCronJobDetails?.pushedCount,
        updatedTransactionsCount: getCronJobDetails?.updatedCount
    }

    delete getDetalsOfCron?._doc?.pulledCount;
    delete getDetalsOfCron?._doc?.newWOCount;
    delete getDetalsOfCron?._doc?.pushedCount;
    delete getDetalsOfCron?._doc?.updatedCount;

    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_SINGLE_INTEGRATION_VIEW_DETAILS,
            data: {

                getDetalsOfCron: {
                    ...getDetalsOfCron?._doc,
                    totalFetchedTransactionsCount: getDetalsOfCron?.totalFetchedTransactionsCount,
                    newlyAddedTransactionsCount: getDetalsOfCron?.newlyAddedTransactionsCount,
                    updatedTransactionsCount: getDetalsOfCron?.updatedTransactionsCount
                },
                getTransactionsOfCron,
                getExceptionsOfCron,
                statisticsOfCron: summaryGrid
            },
        });


})


/**
 * 
 * 
 */

exports.getMerchantCardConnectPayloadHeaders = async (accountId) => {



    const [customerDetails] = await Promise.all([

        cardConnectTransactionsModel.aggregate([
            { $match: { accountId: new mongoose.Types.ObjectId(accountId) } },
            {
                $facet: {
                    customers: [
                        {
                            $group: {
                                _id: "$customerDetails.cardNumber",
                                cardBrand: { $first: "$customerDetails.cardBrand" },
                                cardType: { $first: "$customerDetails.cardType" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                customerCardNumber: "$_id",
                                cardBrand: 1,
                                cardType: 1
                            }
                        }
                    ],
                    batches: [
                        {
                            $group: {
                                _id: "$responseObject.batchid"
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                batchId: "$_id"
                            }
                        }
                    ]
                }
            }
        ])


    ]);


    let transactionStatusKeys = cardConnectPredefinedKeys?.transactionStatusKeys
    let transactionTypeKeys = cardConnectPredefinedKeys?.transactionTypeKeys




    return {
        transactionStatusKeys,
        transactionTypeKeys,
        customerDetails: customerDetails[0].customers,
        batches: customerDetails[0].batches

    }
}



exports.getAllCardConnectPayloadHeaders = async () => {


    let customerAndBatchDetails = await cardConnectTransactionsModel.aggregate([

        {
            $facet: {
                customers: [
                    {
                        $group: {
                            _id: "$customerDetails.cardNumber",
                            cardBrand: { $first: "$customerDetails.cardBrand" },
                            cardType: { $first: "$customerDetails.cardType" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            customerCardNumber: "$_id",
                            cardBrand: 1,
                            cardType: 1
                        }
                    }
                ],
                batches: [
                    {
                        $group: {
                            _id: "$responseObject.batchid"
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            batchId: "$_id"
                        }
                    }
                ]
            }
        }
    ])



    let transactionStatusKeys = cardConnectPredefinedKeys?.transactionStatusKeys
    let transactionTypeKeys = cardConnectPredefinedKeys?.transactionTypeKeys


    return {

        transactionStatusKeys,
        transactionTypeKeys,
        customerDetails: customerAndBatchDetails[0].customers,
        batches: customerAndBatchDetails[0].batches,


    }
}


exports.getMerchantCardConnectExceptions = async (fromDate, toDate, paymentType, accountId) => {

    let getMerchantExceptions = await cardConnectExceptionsModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId)
            }
        },
        {
            $addFields: {
                paymentType: "card-connect"
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
            $lookup: {
                from: "accounts",
                localField: "accountId",
                foreignField: "accountId",
                as: "accountRecord"
            }
        },
        {
            $unwind: "$accountRecord"
        },
        {
            $project: {
                "accountRecord.password": 0

            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])


    return getMerchantExceptions


}












/**
 * API end-point 's funciton for dashboard stats for specific to merchant login
 */

exports.getMerchantCardConnectDashboardStats = asyncWrapper(async (req, res) => {



    let { accountId } = req.params;

    let cardConnectCredentialsOfAccount = await cardconnectIntegrationsCredentialsModel.findOne({ accountId: new mongoose.Types.ObjectId(accountId) })
    let cardConnectSettingsOfAccount = await cardConnectIntegrationsSettingsModel.findOne({ accountId: new mongoose.Types.ObjectId(accountId) })
    var data;
    if (!(cardConnectCredentialsOfAccount && cardConnectSettingsOfAccount)) {
        data = {}
    } else {


        let accountDetails = await accountsModel.findOne({ accountId: new mongoose.Types.ObjectId(accountId) })
        let merchantName = accountDetails.accountName;
        let merchantId = cardConnectCredentialsOfAccount.primaryKeyValues.merchantId
        let merchantSiteUrl = cardConnectCredentialsOfAccount.primaryKeyValues.site


        let getLastSiWeeksResult = getSixWeeksSalesFunction()

        const weeksArray = getLastSiWeeksResult.map(week => ({
            fromDate: new Date(week.fromDate),
            toDate: new Date(week.toDate)
        }));


        const fromDate = new Date(getLastSiWeeksResult[0].fromDate);
        const toDate = new Date(getLastSiWeeksResult[getLastSiWeeksResult.length - 1].toDate);


        let pipeline = await cardConnectTransactionsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId),

                }
            },
            {
                $addFields: {
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
                    transactionId: "$responseObject.retref",
                    currency: "$responseObject.currency",
                    transactionStatus: "$responseObject.status",
                    batchId: "$responseObject.batchid",
                    amount: { $toDouble: "$responseObject.amount" },
                    transactionType: "$responseObject.type"
                }
            },
            {
                $match: {
                    transactionDate: {
                        $gte: fromDate,
                        $lte: toDate
                    },

                }
            },
            {
                $sort: {
                    transactionDate: -1
                }
            },
            {
                $project: {
                    responseObject: 0
                }
            },
            {
                $addFields: {
                    matchedWeek: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: weeksArray,
                                    as: "week",
                                    cond: {
                                        $and: [
                                            { $gte: ["$transactionDate", "$$week.fromDate"] },
                                            { $lte: ["$transactionDate", "$$week.toDate"] }
                                        ]
                                    }
                                }
                            },
                            0
                        ]
                    }
                }
            },

            {
                $group: {
                    _id: {
                        fromDate: "$matchedWeek.fromDate",
                        toDate: "$matchedWeek.toDate"
                    },
                    settledTransactionsCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "SALE"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },

                    settledAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "SALE"] }
                                    ]
                                },
                                "$amount",
                                0
                            ]
                        }
                    },
                    batchIds: { $addToSet: "$batchId" }
                }
            },
            {
                $addFields: {
                    batchCount: { $size: "$batchIds" }
                }
            },
            {
                $project: {
                    _id: 0,
                    fromDate: "$_id.fromDate",
                    toDate: "$_id.toDate",
                    settledTransactionsCount: 1,
                    settledAmount: 1,
                    batchIds: 1,
                    batchCount: 1

                }
            }


        ])


        const sixWeekAggregateFinalResult = weeksArray.map(week => {
            const matchingWeek = pipeline.find(r =>
                String(r.fromDate) === String(week.fromDate) &&
                String(r.toDate) === String(week.toDate)
            );

            return matchingWeek || {
                fromDate: week.fromDate,
                toDate: week.toDate,
                "settledTransactionsCount": 0,
                "settledAmount": 0,
                "batchIds": [],
                "batchCount": 0,
            };
        });
        //-------------------------------------------
        let latestTenTransactions = await cardConnectTransactionsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId),

                }
            },
            {
                $addFields: {
                    merchantId: "$responseObject.merchid",
                    merchantName: merchantName,
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
                    transactionId: "$responseObject.retref",
                    currency: "$responseObject.currency",
                    transactionStatus: "$responseObject.status",
                    batchId: "$responseObject.batchid",
                    amount: { $toDouble: "$responseObject.amount" },
                    transactionType: "$responseObject.type",

                }
            },
            {
                $sort: {
                    transactionDate: -1
                }
            },
            {
                $limit: 10
            },

            {
                $project: {
                    responseObject: 0
                }
            }

        ])

        //-------------------------------------------------------


        let latestActivityLogs = await cardConnectIntegrationsCronsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId)
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    newWOCount: 0
                }
            },


            {
                $addFields: {
                    merchantId: { $literal: merchantId },
                    merchantName: { $literal: merchantName },
                    accountType: { $literal: accountDetails.accountType },

                    siteUrl: { $literal: merchantSiteUrl },
                }
            },



        ])



        //-----------------------------------------------------------------------------------------------
        let latestBatches = await cardConnectTransactionsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId),
                },
            },
            {
                $addFields: {
                    merchantId: { $literal: merchantId },
                    merchantName: { $literal: merchantName },
                    batchId: "$responseObject.batchid",
                    transactionStatus: "$responseObject.status",
                    transactionType: "$responseObject.type",
                    amount: { $toDouble: "$responseObject.amount" },
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
                    transactionId: "$responseObject.retref",
                },
            },

            {
                $group: {
                    _id: "$batchId",
                    transactionsCount: { $sum: 1 },
                    settledTransactionsCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "SALE"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    settledAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "SALE"] }
                                    ]
                                },
                                "$amount",
                                0
                            ]
                        }
                    },
                    refundedTransactionsCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "REFUND"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    refundedAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "REFUND"] }
                                    ]
                                },
                                { $abs: "$amount" }, // convert negative string to number, then abs
                                0
                            ]
                        }
                    },
                    // lastCapturedTransactionDate: { $max: "$transactionDate" }  // ✅ new field
                    lastTransactionCaptured: {
                        $top: {
                            sortBy: { transactionDate: -1 },
                            output: {
                                transactionId: "$transactionId",
                                transactionDate: "$transactionDate"
                            }
                        }
                    },
                    merchantId: { $first: "$merchantId" },
                    merchantName: { $first: "$merchantName" }

                }
            },
            {
                $project: {
                    _id: 0,
                    batchId: "$_id",
                    merchantId: 1,
                    merchantName: 1,
                    transactionsCount: 1,
                    settledTransactionsCount: 1,
                    settledAmount: 1,
                    refundedTransactionsCount: 1,
                    refundedAmount: 1,
                    // lastCapturedTransactionDate: 1
                    lastTransactionCaptured: 1
                }
            },
            {
                $sort: { batchId: -1 }  // latest batches first
            },
            {
                $limit: 5
            }
        ]);

        //------------------------------------------------------------------
        let summaryGrid = await cardConnectTransactionsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId),
                },
            },
            {
                $addFields: {
                    batchId: "$responseObject.batchid",
                    transactionStatus: "$responseObject.status",
                    transactionType: "$responseObject.type",
                    amount: { $toDouble: "$responseObject.amount" },
                    cardNumber: "$customerDetails.cardNumber",
                    cardBrand: "$customerDetails.cardBrand",
                    cardType: "$customerDetails.cardType",
                },
            },
            {
                $lookup: {
                    from: "cardconnectexceptions",
                    localField: "accountId",
                    foreignField: "accountId",
                    as: "exceptions",
                },
            },
            {
                $group: {
                    _id: null,

                    // transaction counts
                    totalTransactionsCount: { $sum: 1 },

                    settledTransactionsCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "SALE"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },

                    settledAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "SALE"] }
                                    ]
                                },
                                "$amount",
                                0
                            ]
                        }
                    },

                    refundedTransactionsCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "REFUND"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },

                    refundedAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "REFUND"] }
                                    ]
                                },
                                { $abs: "$amount" },
                                0
                            ]
                        }
                    },

                    // distinct batch count
                    batchesCount: { $addToSet: "$batchId" },

                    // distinct customer count based on 3 fields
                    customersSet: {
                        $addToSet: {
                            cardNumber: "$cardNumber",
                            cardBrand: "$cardBrand",
                            cardType: "$cardType"
                        }
                    },
                    exceptions: { $first: "$exceptions" }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalTransactionsCount: 1,
                    settledTransactionsCount: 1,
                    settledAmount: 1,
                    refundedTransactionsCount: 1,
                    refundedAmount: 1,
                    batchesCount: { $size: "$batchesCount" },
                    customersCount: { $size: "$customersSet" },
                    totalExceptionsCount: { $size: "$exceptions" }
                }
            }
        ]);

        summaryGrid = summaryGrid[0] ? summaryGrid[0] : {
            totalTransactionsCount: 0,
            settledTransactionsCount: 0,
            settledAmount: 0,
            refundedTransactionsCount: 0,
            refundedAmount: 0,
            batchesCount: 0,
            customersCount: 0,
            totalExceptionsCount: 0
        }
        //-----------------------------------------------------


        let last24HoursStats = await cardConnectTransactionsModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId),
                    createdAt: {
                        $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
                        $lte: new Date(),
                    },
                },
            },
            {
                $addFields: {
                    batchId: "$responseObject.batchid",
                    transactionStatus: "$responseObject.status",
                    transactionType: "$responseObject.type",
                    amount: { $toDouble: "$responseObject.amount" },
                    cardNumber: "$customerDetails.cardNumber",
                    cardBrand: "$customerDetails.cardBrand",
                    cardType: "$customerDetails.cardType",
                },
            },

            {
                $group: {
                    _id: null,

                    totalTransactionsCount: { $sum: 1 },

                    settledTransactionsCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "SALE"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },

                    settledAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "SALE"] }
                                    ]
                                },
                                "$amount",
                                0
                            ]
                        }
                    },

                    refundedTransactionsCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "REFUND"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },

                    refundedAmount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$transactionStatus", "Processed"] },
                                        { $eq: ["$transactionType", "REFUND"] }
                                    ]
                                },
                                { $abs: "$amount" },
                                0
                            ]
                        }
                    },

                    batchesCount: { $addToSet: "$batchId" },

                    customersSet: {
                        $addToSet: {
                            cardNumber: "$cardNumber",
                            cardBrand: "$cardBrand",
                            cardType: "$cardType"
                        }
                    },


                }
            },
            {
                $project: {
                    _id: 0,
                    totalTransactionsCount: 1,
                    settledTransactionsCount: 1,
                    settledAmount: 1,
                    refundedTransactionsCount: 1,
                    refundedAmount: 1,
                    batchesCount: { $size: "$batchesCount" },
                    customersCount: { $size: "$customersSet" },

                }
            }
        ]);
        let getExceptionsCountLast24Hours = await cardConnectExceptionsModel.find({
            accountId: new mongoose.Types.ObjectId(accountId),
            createdAt: {
                $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
                $lte: new Date(),
            },

        }).countDocuments()

        // 🟢 Ensure last24HoursStats is always one object
        let responseObjLast24Hours = (last24HoursStats.length > 0 ? last24HoursStats[0] : {
            totalTransactionsCount: 0,
            settledTransactionsCount: 0,
            settledAmount: 0,
            refundedTransactionsCount: 0,
            refundedAmount: 0,
            batchesCount: 0,
            customersCount: 0
        });

        // add exceptions count to the object
        responseObjLast24Hours.totalExceptionsCount = getExceptionsCountLast24Hours;


        data = {
            merchantName,
            merchantId,
            merchantSiteUrl,
            sixWeekAggregateFinalResult,
            latestTenTransactions,
            latestActivityLogs,
            latestBatches,
            summaryGrid,
            responseObjLast24Hours
        }

    }


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_MERCHANT_LEVEL_CARD_CONNECT_DASHBOARD,
            data
        });




})