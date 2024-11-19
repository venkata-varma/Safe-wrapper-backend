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
const { getWebHooksLogsSixWeekSalesData } = require("../../utils/accountInsightUtils");

exports.createWebHook = asyncWrapper(async (req, res) => {
    const { accountId, integrationsMasterId } = req.body
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
        await webHooksModel.create({ ...req.body })
        return res
            .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
            .json({
                status: customConstants.messages.MESSAGE_SUCCESS,
                message: customConstants.messages.MESSAGE_ADD_WEBHOOK
            });
    }

})

exports.validateIntegrationForWebHook = asyncWrapper(async (req, res, next) => {
    const { accountId, integrationsMasterId, webHookId } = req.query
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

exports.getAllWebHooks = asyncWrapper(async (req, res) => {
    const { accountId, integrationsMasterId } = req.query
    // const getAllWebHooks = await webHooksModel.find({accountId,integrationsMasterId}).sort({_id:-1})

    const statusesEnum = ['received', 'initiated', 'delivered', 'failed', 'deleted'];
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
                "webHookDetails.webhookLogsDetails": "$$REMOVE" // Remove the `webhookLogsDetails` field
            }
        },
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
                statuses: 1,
                _id: 0
            }
        }
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
                                                    cond: { $eq: ["$$item.status", "$$status"] }
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
                }
            }
        },
        {
            $project: {
                statuses: "$mergedStatuses.count"
            }
        }
    ]);

    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_GET_ALL_WEBHOOK,
            data: {
                getAllWebHooks,
                getPast6WeeksStatuses: getPast6WeeksStatuses,
                getOverallStatuses: getOverallStatuses[0].statuses
            }
        });
})

exports.getIndividualWebHook = asyncWrapper(async (req, res) => {
    const { accountId, integrationsMasterId, webHookId } = req.query
    const webHookDetails = await webHooksModel.findOne({ accountId, integrationsMasterId, webHookId }).lean()
    if (!webHookDetails) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_WEBHOOK_NOT_FOUND
        });
    }
    else {
        return res
            .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
            .json({
                status: customConstants.messages.MESSAGE_SUCCESS,
                message: customConstants.messages.MESSAGE_GET_INDIVIDUAL_WEBHOOK,
                data: webHookDetails
            });
    }
})

exports.deleteWebHook = asyncWrapper(async (req, res) => {
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
    }
})

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