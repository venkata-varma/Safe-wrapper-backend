const asyncWrapper = require("../../middleware/asyncWrapper");
const webHooksModel = require("../../models/webHooksMasterModel");
const customConstants = require('../../config/constants.json')
const integrationsMasterModel = require('../../models/integrationsMasterModel')
const jwt = require('jsonwebtoken');
const { encryptData, decryptData } = require("../../utils/encryptionAlgorithms");
const webHooksMasterModel = require("../../models/webHooksMasterModel");
const webHookLogsModel = require("../../models/webHookLogs");
const { default: mongoose } = require("mongoose");
const moment = require('moment');
const { stringify } = require('flatted');
const { getWebHooksLogsSixWeekSalesData } = require("../../utils/accountInsightUtils");

/**
 * Create webhook for an integration.
 * Initially validate the account whether it is in active or not.
 * Same validation for integration.
 * If both the conditions satisfied then webhook will be created or else returns the validation errors. 
 */

exports.createWebHook = asyncWrapper(async (req, res) => {
    const { accountId, integrationsMasterId, authenticationCode } = req.body

    const encryptedWebHookAuthCode = encryptData({ authenticationCode: authenticationCode })

    const IntegrationMasterDetails = await integrationsMasterModel.findOne({ accountId: accountId, _id: integrationsMasterId }).populate('accountId')

    if (IntegrationMasterDetails.accountId.status !== "active") {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED
        });
    }
    if (IntegrationMasterDetails.status !== "active") {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_ID_NOT_ACTIVE
        });
    }
    else {
        await webHooksModel.create({ ...req.body, authenticationCode: encryptedWebHookAuthCode })
        return res
            .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
            .json({
                status: customConstants.messages.MESSAGE_SUCCESS,
                message: customConstants.messages.MESSAGE_ADD_WEBHOOK
            });
    }

})

/**
 * This middleware verifies the account and integration exist.
 */

exports.validateIntegrationForWebHook = asyncWrapper(async (req, res, next) => {
    const { accountId, integrationsMasterId, webHookId } = req.query

    if (!accountId || !integrationsMasterId) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_MISSING_IDS
        });
    }
    const IntegrationMasterDetails = await integrationsMasterModel.findOne({ accountId: accountId, _id: integrationsMasterId }).populate('accountId')

    if (IntegrationMasterDetails.accountId.status !== "active") {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED
        });
    }
    if (IntegrationMasterDetails.status !== "active") {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_ID_NOT_ACTIVE
        });
    }
    else {
        next()
    }

})

/**
 * This function used to updates the webhook details.
 */

exports.updateWebHook = asyncWrapper(async (req, res) => {
    const { accountId, integrationsMasterId, webHookId } = req.query
    await webHooksModel.findOneAndUpdate({ accountId, integrationsMasterId, webHookId }, { ...req.body }, { new: true })
    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_UPDATE_WEBHOOK
        });
})

/**
 * Get all webhooks by accountId, integrationsMasterId.
 * This function is used to get the webhook details along with the webhook logs with the respective status of logs.
 * Get the past 6 week statuses of webhook logs count.
 * Get the overall statuses of webhook logs count by matching the accountID and integrationsMasterId.
 */
exports.getAllWebHooks = asyncWrapper(async (req, res) => {
    const { accountId, integrationsMasterId } = req.query
    // const getAllWebHooks = await webHooksModel.find({accountId,integrationsMasterId}).sort({_id:-1})

    const statusesEnum = ['received','initiated','sent','delivered','failed','deleted'];
    const getAllWebHooks = await webHooksModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId),
                integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId)
            }
        },
        {
            $lookup: {
                from: "webhooklogs",
                foreignField: "webHookId",
                localField: "_id",
                as: "webhookLogsDetails"
            }
        },
        {
            $unwind: {
                path: "$webhookLogsDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: {
                    webHookId: "$_id",
                    status: "$webhookLogsDetails.status"
                },
                count: { $sum: 1 },
                webHookDetails: { $first: "$$ROOT" }
            }
        },
        {
            $group: {
                _id: "$_id.webHookId",
                webHookDetails: { $first: "$webHookDetails" },
                statuses: {
                    $push: {
                        status: "$_id.status",
                        count: "$count"
                    }
                }
            }
        },
        {
            $addFields: {
                statuses: {
                    $map: {
                        input: statusesEnum,
                        as: "statusEnum",
                        in: {
                            status: "$$statusEnum",
                            count: {
                                $reduce: {
                                    input: "$statuses",
                                    initialValue: 0,
                                    in: {
                                        $cond: [
                                            { $eq: ["$$this.status", "$$statusEnum"] },
                                            { $add: ["$$value", "$$this.count"] },
                                            "$$value"
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                "webHookDetails.webhookLogsDetails": "$$REMOVE", // Remove the `webhookLogsDetails` field
                "webHookDetails.statuses": "$statuses"
            }
        },
        {
            $replaceRoot: {
                newRoot: "$webHookDetails"
            }
        }
        /*
        {
            $project: {
                // webHookDetails: {
                //     _id: 1,
                //     webHookId: "$webHookDetails._id",
                //     accountId: "$webHookDetails.accountId",
                //     integrationsMasterId: "$webHookDetails.integrationsMasterId",
                //     webHookName: "$webHookDetails.webHookName",
                //     webHookUrl: "$webHookDetails.webHookUrl",
                //     authenticationCode: "$webHookDetails.authenticationCode",
                //     status: "$webHookDetails.status",
                //     createdAt: "$webHookDetails.createdAt",
                //     updatedAt: "$webHookDetails.updatedAt",
                //     requestObject: "$webHookDetails.requestObject"
                // },
                webHookDetails: 1,
                // statuses: 1,
                _id: 0
            }
        }
            */
    ]);

    const getWebHookLogs = await webHooksModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId),
                integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
            }
        },
        {
            $lookup: {
                from: "webhooklogs",
                foreignField: "webHookId",
                localField: "_id",
                as: "webhookLogsDetails"
            }
        }
    ]);
    const getPast6WeeksStatuses = await getWebHooksLogsSixWeekSalesData(getWebHookLogs)

    const getOverallStatuses = await webHooksModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId),
                integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
            }
        },
        {
            $lookup: {
                from: "webhooklogs",
                foreignField: "webHookId",
                localField: "_id",
                as: "webhookLogsDetails"
            }
        },
        {
            $unwind: {
                path: "$webhookLogsDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: "$webhookLogsDetails.status",
                count: { $sum: 1 }
            }
        },
        {
            $addFields: {
                status: "$_id",
                count: "$count",
                _id: 0
            }
        },
        {
            $group: {
                _id: null,
                statuses: { $push: { status: "$status", count: "$count" } }
            }
        },
        {
            $project: {
                _id: 0,
                mergedStatuses: {
                    /*
                    $map: {
                        input: statusesEnum,
                        as: "status",
                        in: {
                            status: "$$status",
                            count: {
                                $ifNull: [
                                    {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$statuses",
                                                    as: "item",
                                                    cond: [ {$eq: ["$$item.status", "$$status"]},
                                                    { $add: ["$$value", "$$this.count"] },
                                                    "$$value"
                                                 ]
                                                }
                                            },
                                            0
                                        ]
                                    },
                                    { count: 0 }
                                ]
                            }
                        }
                    }
                        */
                    $map: {
                        input: statusesEnum,
                        as: "statusEnum",
                        in: {
                            status: "$$statusEnum",
                            count: {
                                $reduce: {
                                    input: "$statuses",
                                    initialValue: 0,
                                    in: {
                                        $cond: [
                                            { $eq: ["$$this.status", "$$statusEnum"] },
                                            { $add: ["$$value", "$$this.count"] },
                                            "$$value"
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            $project: {
                statuses: "$mergedStatuses"
            }
        }
    ]);

    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_GET_ALL_WEBHOOK,
            data: {
                webHooks: getAllWebHooks,
                pastSixWeeksData: getPast6WeeksStatuses,
                overallStatusesCount: getOverallStatuses[0]?.statuses || []
            }
        });
})

/**
 * Get single webhook details by accountId, integrationsMasterId, webHookId along webhook logs statuses details.
 * Validate the webhook exist or not.
 * If not exist returns the validation error.
 * Else returns the webhook data.
 */
exports.getIndividualWebHook = asyncWrapper(async (req, res) => {
    const { accountId, integrationsMasterId, webHookId } = req.query
    const webHookDetails = await webHooksModel.findOne({ _id: webHookId, accountId, integrationsMasterId }).lean()
    if (!webHookDetails) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND
        });
    }
    else {
        const statusesEnum = ['received','initiated','sent','delivered','failed','deleted'];
        const getAllWebHooks = await webHooksModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(webHookId),
                    accountId: new mongoose.Types.ObjectId(accountId),
                    integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId)
                }
            },
            {
                $lookup: {
                    from: "webhooklogs",
                    foreignField: "webHookId",
                    localField: "_id",
                    as: "webhookLogsDetails"
                }
            },
            {
                $unwind: {
                    path: "$webhookLogsDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: {
                        webHookId: "$_id",
                        status: "$webhookLogsDetails.status"
                    },
                    count: { $sum: 1 },
                    webHookDetails: { $first: "$$ROOT" }
                }
            },
            {
                $group: {
                    _id: "$_id.webHookId",
                    webHookDetails: { $first: "$webHookDetails" },
                    statuses: {
                        $push: {
                            status: "$_id.status",
                            count: "$count"
                        }
                    }
                }
            },
            {
                $addFields: {
                    statuses: {
                        $map: {
                            input: statusesEnum,
                            as: "statusEnum",
                            in: {
                                status: "$$statusEnum",
                                count: {
                                    $reduce: {
                                        input: "$statuses",
                                        initialValue: 0,
                                        in: {
                                            $cond: [
                                                { $eq: ["$$this.status", "$$statusEnum"] },
                                                { $add: ["$$value", "$$this.count"] },
                                                "$$value"
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    "webHookDetails.webhookLogsDetails": "$$REMOVE", // Remove the `webhookLogsDetails` field
                    "webHookDetails.statuses": "$statuses"
                }
            },
            {
                $replaceRoot: {
                    newRoot: "$webHookDetails"
                }
            }
            /*
            {
                $project: {
                    // webHookDetails: {
                    //     _id: 1,
                    //     webHookId: "$webHookDetails._id",
                    //     accountId: "$webHookDetails.accountId",
                    //     integrationsMasterId: "$webHookDetails.integrationsMasterId",
                    //     webHookName: "$webHookDetails.webHookName",
                    //     webHookUrl: "$webHookDetails.webHookUrl",
                    //     authenticationCode: "$webHookDetails.authenticationCode",
                    //     status: "$webHookDetails.status",
                    //     createdAt: "$webHookDetails.createdAt",
                    //     updatedAt: "$webHookDetails.updatedAt",
                    //     requestObject: "$webHookDetails.requestObject"
                    // },
                    webHookDetails: 1,
                    // statuses: 1,
                    _id: 0
                }
            }
                */
        ]);
        return res
            .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
            .json({
                status: customConstants.messages.MESSAGE_SUCCESS,
                message: customConstants.messages.MESSAGE_GET_INDIVIDUAL_WEBHOOK,
                data: getAllWebHooks[0]
            });
    }
})

/**
 * Update the webhook status.
 */
exports.updateWebHookStatus = asyncWrapper(async (req, res) => {
    const { accountId, integrationsMasterId, webHookId } = req.query
    const { status } = req.body
    console.log('req:===', req.query)
    let webHookDetails

    webHookDetails = await webHooksModel.findOne({ _id: webHookId, accountId: accountId, integrationsMasterId: integrationsMasterId }).lean()
    console.log('webHookDetails:===', webHookDetails)

    if (!webHookDetails) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND
        });
    }
    else {
        if (status === 'delete') {
            webHookDetails = await webHooksModel.findOneAndUpdate({ _id: webHookId, accountId: accountId, integrationsMasterId: integrationsMasterId }, { status: "deleted" }, { new: true })
            return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
                status: customConstants.messages.MESSAGE_SUCCESS,
                message: customConstants.messages.MESSAGE_DELETE_WEBHOOK,
            })
        }
        else if (status === 'active') {
            webHookDetails = await webHooksModel.findOneAndUpdate({ _id: webHookId, accountId: accountId, integrationsMasterId: integrationsMasterId }, { status: "active" }, { new: true })
            return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
                status: customConstants.messages.MESSAGE_SUCCESS,
                message: customConstants.messages.MESSAGE_ACTIVATE_WEBHOOK,
            })
        }
        else if (status === 'offline') {
            webHookDetails = await webHooksModel.findOneAndUpdate({ _id: webHookId, accountId: accountId, integrationsMasterId: integrationsMasterId }, { status: "offline" }, { new: true })
            return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
                status: customConstants.messages.MESSAGE_SUCCESS,
                message: customConstants.messages.MESSAGE_WEBHOOK_OFFLINE,
            })
        }
    }
})

/**
 * Generates the webhook URL and authentication token for webhook.
 */
exports.generateWebhookToken = asyncWrapper(async (req, res) => {
    const { accountId } = req.query
    const randomNumber = Math.floor(10000 + Math.random() * 90000)
    let webHookUrl = `${process.env.DOMAIN_NAME}webhook/${randomNumber}/${accountId}`
    let webHookAuthenticationCode = jwt.sign({ accountId: accountId }, 'secret')
    const encryptedWebHookAuthCode = encryptData({ authenticationCode: webHookAuthenticationCode })
    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_GET_INDIVIDUAL_WEBHOOK,
            data: {
                webHookUrl: webHookUrl,
                authenticationCode: encryptedWebHookAuthCode
            }
        });
})

/**
 * Validates the webhook data for webhook log.
 */
exports.validateWebHookData = asyncWrapper(async (req, res, next) => {
    const token = req.headers.authorization.split(' ')[1]
    const webHookDetails = await webHooksMasterModel.findOne({ authenticationCode: token }).populate('accountId integrationsMasterId').lean()
    // console.log('webHookDetails:===',webHookDetails)
    if (!webHookDetails) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND
        });
    }
    if (webHookDetails.status !== "active") {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND
        });
    }
    if (!webHookDetails.accountId || webHookDetails.accountId.status !== "active") {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED
        });
    }
    if (!webHookDetails.integrationsMasterId || webHookDetails.integrationsMasterId.status !== "active") {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_ID_NOT_ACTIVE
        });
    }
    else {
        next()
    }
})

/**
 * Create webhook log by validating token.
 */

exports.createWebHookLog = asyncWrapper(async (req, res) => {
    const { dataObject, primaryHookId } = req.body
    const token = req.headers.authorization.split(' ')[1]
    const webHookDetails = await webHooksMasterModel.findOne({ authenticationCode: token })
    await webHookLogsModel.create({
        accountId: webHookDetails.accountId,
        integrationsMasterId: webHookDetails.integrationsMasterId,
        webHookId: webHookDetails._id,
        dataObject: dataObject,
        primaryHookId: primaryHookId
    })
    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_CREATE_WEBHOOK_LOG
        });
})


/**
 * Create CPD test webhook log.
 */

exports.CPDTestWebHookLog = asyncWrapper(async (req, res) => {
    // const token = req.headers.authorization.split(' ')[1]
    // const webHookDetails = await webHooksMasterModel.findOne({ authenticationCode: token })
    const sanitizedDataObject = stringify(req.body);

    // Create a new log entry in the database
    await webHookLogsModel.create({
        webHookId: new mongoose.Types.ObjectId('674d78c44924d5d293cf53ae'),
        dataObject: sanitizedDataObject,     
        primaryHookId: ""     
    });
    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_CREATE_WEBHOOK_LOG
        });
})
/**
 * Get the webhook logs reports by filters.
 */
exports.getWebHookLogsReports = asyncWrapper(async (req, res) => {
    const { accountId, integrationsMasterId, webHookId } = req.query;

    // Retrieve and validate webHook details
    const webHookDetails = await webHooksModel.findById(webHookId);
    if (!webHookDetails || webHookDetails.status !== "active") {
        return res
            .status(customConstants.statusCodes.BAD_REQUEST)
            .json({
                status: customConstants.messages.MESSAGE_FAIL,
                message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND,
            });
    }

    // Retrieve query parameters
    let statusQuery = req.query.status ? req.query.status.toLowerCase() : null;
    const providedFromDate = req.query.fromDate ? new Date(req.query.fromDate) : null;
    const providedToDate = req.query.toDate ? new Date(req.query.toDate) : null;

    // Set default date range (last 7 days)
    // const toDate = providedToDate || new Date();
    // const fromDate = providedFromDate || new Date(new Date().setDate(new Date().getDate() - 6));
    const toDate = providedToDate ? moment(providedToDate).add(1, 'days').format('YYYY-MM-DDTHH:mm:ss') : moment().add(1, 'days').format('YYYY-MM-DDTHH:mm:ss');
    const fromDate = providedFromDate ? moment(providedFromDate).format('YYYY-MM-DDTHH:mm:ss') : moment().subtract(6, 'days').format('YYYY-MM-DDTHH:mm:ss');


    // Validate status values
    const validStatuses = ['received','initiated','sent','delivered','failed','deleted'];
    if (statusQuery && !validStatuses.includes(statusQuery)) {
        statusQuery = null
    }

    let webHookLogsReports = [];

    if (accountId === "null" || integrationsMasterId === "null" || webHookId === "null") {
        webHookLogsReports = [];
    } else {
        webHookLogsReports = await webHooksModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(accountId),
                    integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
                    webHookId: new mongoose.Types.ObjectId(webHookId),
                },
            },
            {
                $lookup: {
                    from: "webhooklogs",
                    localField: "_id",
                    foreignField: "webHookId",
                    as: "webHookLogsDetails",
                },
            },
            {
                $addFields: {
                    webHookLogsDetails: {
                        $filter: {
                            input: "$webHookLogsDetails",
                            as: "webHookLogs",
                            cond: {
                                $and: [
                                    { $gte: ["$$webHookLogs.createdAt", new Date(fromDate)] },
                                    { $lte: ["$$webHookLogs.createdAt", new Date(toDate)] },
                                    ...(statusQuery
                                        ? [{ $eq: ["$$webHookLogs.status", statusQuery] }]
                                        : []),
                                ],
                            },
                        },
                    },
                },
            },
        ]);
    }

    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_WEBHOOK_LOGS_REPORTS,
            data: webHookLogsReports
        });
});
