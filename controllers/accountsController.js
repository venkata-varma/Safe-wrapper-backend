// const axios = require('axios');
const accountsModel = require('../models/accountsModels/accountsModel');
const accountSettingsModel = require('../models/accountsModels/accountSettingsModel')
const authentication = require('../utils/authentication');
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../config/constants.json');
const { hashPwd } = require('../utils/helpers');
const usersModel = require('../models/usersModels/usersModel');
const mongoose = require("mongoose")
const integrationsMasterModel = require('../models/integrationsMasterModels/integrationsMasterModel');
const CPDWorkordersModel = require('../models/workOrdersModels/CPDWorkordersModel');
const DFWorkOrdersModel = require('../models/workOrdersModels/DFWorkOrdersModel');
const integtationExceptionsModel = require('../models/integrationsMasterModels/integrationsExceptionsModel');
const integrationCronsModel = require('../models/integrationsMasterModels/integrationsCronsModel');
const { sixWeekSales } = require('../utils/sixWeekSalesFunction');
const workOrderLifeCycleModel = require('../models/workOrdersModels/workOrderLifeCycleModel');
const { validatePhoneNumber } = require('../utils/userLoginValidation');
const {getSourceAndDestinationWOLifeCycle}=require('../utils/general')
/*
Miidleware function to controller, "createAccount"
Mandatory fields ->  AccountName, CompanyName, Email, Phone, Password, City, State, Pincode, Country
If returns True, moves to "next" function,-> "createAccount"
*/
exports.validateAccountRegistration = asyncWrapper(async (req, res, next) => {
    const { accountName, companyName, email, phone, password, city, state, pincode, country } = req.body;

    //console.log(accountName, companyName, email, phone, password,"okkkkk");
    if (!accountName || !companyName || !email || !phone || !password || !city || !state || !country || !pincode) {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_MANDATORY_FIELDS
        });
    }
    // if(!req.file){
    //     return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
    //         status: customConstants.messages.MESSAGE_FAIL,
    //         message: customConstants.messages.MESSAGE_LOGO_MANDATORY
    //     });
    // }
    if (!await validatePhoneNumber(phone)) {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_PHONE_NUMBER_VALIDATE
        });
    }
    else {
        next()
    }
})


/*
If middleware returns true, this function is to create a New Account along with one New User
Returns newly created Account with one associated user.
*/
exports.createAccount = asyncWrapper(async (req, res) => {
    const baseUrl = 'https://ihubapi.dev.devrabbit.co/';
    const { accountName, companyName, email, phone, password, status } = req.body
    const accountDetails = await accountsModel.findOne({ $or: [{ email }, { phone }] })
    if (accountDetails) {
        return res.status(409).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_EXIST
        })
    }
    else {
        req.body.password = await hashPwd(password)
        const accountData = await accountsModel.create({
            ...req.body,
            logo: req.file ? `${baseUrl}/accountLogos/${req.file.filename}` : ""
        })
        const customId = new mongoose.Types.ObjectId();

        const user = await usersModel.create({
            _id: customId,
            userId: customId,
            createdBy: customId,
            accountId: accountData._id,
            name: accountName,
            password: req.body.password,
            companyName: companyName,
            phone: phone,
            email: email,
            role: 'super-admin',
        });
        await accountSettingsModel.create({
            accountId: accountData._id
        })
        //To delete Password from Response while displaying it.
        delete accountData._doc.password;
        delete user._doc.password;

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_ACCOUNT_CREATED,

        })
    }
});


/**
  *Function to delete account -Actually to Deactivate account by Admin
*/
exports.deleteAccount = asyncWrapper(async (req, res) => {
    const accountDetails = await accountsModel.findById(req.params.accountId).lean();
    if (accountDetails.status === 'deleted') {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
        });
    }
    const updatedAccount = await accountsModel.findByIdAndUpdate(req.params.accountId, { $set: { status: 'deleted' } }, { new: true })

    // Return success response
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ACCOUNT_DELETED,
        data: updatedAccount,
    });
});

/*
* Verify the status of account.
* If status is active pass the middleware.
*/
exports.validateAccountStatus = asyncWrapper(async (req, res, next) => {
    const { accountId } = req.params
    const verifyAccountStatus = await accountsModel.findById(accountId)
    console.log('verifyAccountStatus')
    if (verifyAccountStatus.status === 'deleted') {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
        });
    }
    else {
        next()
    }
});

/**
 * Get account information by accountId.
 * Get all work orders count (CPD, DF), integrationsExceptions and integrationsCount.
 */


exports.getAccountIntegrationsInformation = asyncWrapper(async (req, res) => {
    const { accountId } = req.params
    const accountInformation = await accountsModel.findById(accountId);
    const integrationsOfAccount = await integrationsMasterModel.find({ accountId: accountId });
    const integrationExceptions = await integtationExceptionsModel.find({ accountId: accountId });
    const integrationCronsCount = await integrationCronsModel.find({ accountId: accountId });

    const integrationsServiceProvidersWorkOrdersCount = await integrationsMasterModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId)
            }
        },
        {
            $lookup: {
                from: 'cpdworkorders',
                localField: '_id',
                foreignField: 'integrationsMasterId',
                as: 'CPDWorkOrderDetails'
            }
        },
        {
            $lookup: {
                from: 'dfworkorders',
                localField: '_id',
                foreignField: 'integrationsMasterId',
                as: 'DFWorkOrderDetails'
            }
        },
        {
            $lookup: {
                from: 'cysworkorders',
                localField: '_id',
                foreignField: 'integrationsMasterId',
                as: 'CYSWorkOrderDetails'
            }
        },
        {
            $project: {
                CPDWorkOrderCount: { $size: '$CPDWorkOrderDetails' },
                DFWorkOrderCount: { $size: '$DFWorkOrderDetails' },
                CYSWorkOrderCount: { $size: '$CYSWorkOrderDetails' },
            }
        },
        {
            $project: {
                workOrders: [
                    { serviceprovider: 'CPD', workOrders: '$CPDWorkOrderCount' },
                    { serviceprovider: 'DF', workOrders: '$DFWorkOrderCount' },
                    { serviceprovider: 'CYS', workOrders: '$CYSWorkOrderCount' },
                ]

            }
        },
        {
            $unwind: '$workOrders'
        },
        {
            $group: {
                _id: '$workOrders.serviceprovider',
                totalWorkOrders: { $sum: '$workOrders.workOrders' },
            }
        },
        {
            $project: {
                _id: 0,
                serviceprovider: '$_id',
                workOrders: '$totalWorkOrders'
            }
        }
    ]);

    // To get the detailed CPD work orders in initiated status:
    const failedCPDWorkOrders = await integrationsMasterModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId)
            }
        },
        {
            $lookup: {
                from: 'cpdworkorders',
                localField: '_id',
                foreignField: 'integrationsMasterId',
                as: 'CPDWorkOrderDetails'
            }
        },
        {
            $project: {
                CPDWorkOrderDetails: {
                    $filter: {
                        input: '$CPDWorkOrderDetails',
                        as: 'workOrder',
                        cond: { $eq: ['$$workOrder.status', 'initiated'] }
                    }
                }
            }
        },
        {
            $unwind: '$CPDWorkOrderDetails'
        },
        {
            $replaceRoot: { newRoot: '$CPDWorkOrderDetails' }
        }
    ]);

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ACCOUNT_INTEGRATION_INFORMATION,
        data: {
            accountInformation,
            integrationsOfAccount,
            integrationExceptionsCount: integrationExceptions.length,
            dataSyncCount: integrationCronsCount.length,
            failedCPDWorkOrders,
            integrationsServiceProvidersWorkOrdersCount,
        },
    })
})


/**
 * Function to return reports of respective account with respective filters 
 * @params "accountId"
 */
exports.getAccountIntegrationsReports = asyncWrapper(async (req, res) => {
    const integrationsQuery = req.query.integration;

    //const integrationsQuery = req.query.integration;
    const priorityQuery = req.query.priority;
    const fromDateQuery = req.query.fromDate ? new Date(req.query.fromDate) : null;
    const toDateQuery = req.query.toDate ? new Date(new Date(req.query.toDate).setDate(new Date(req.query.toDate).getDate() + 1)) : (fromDateQuery ? new Date() : null);
    const searchQuery = req.query.search ? new RegExp(`${req.query.search}`, 'i') : null;
    var accountReports = [];
    var sixWeeksSalesGraph = [];
    if (integrationsQuery === 'null' || !integrationsQuery) {

        accountReports = []
        sixWeeksSalesGraph = [];
    } else if (integrationsQuery) {


        accountReports = await integrationsMasterModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(req.params.accountId),
                    ...(integrationsQuery !== 'all-integrations' && {
                        _id: new mongoose.Types.ObjectId(integrationsQuery)
                    })
                }
            },
            { $sort: { createdAt: 1 } },
            {
                $lookup: {
                    from: "cpdworkorders",
                    localField: "_id",
                    foreignField: "integrationsMasterId",
                    as: "CPDWorkOrders"
                }
            },
            {
                $lookup: {
                    from: "dfworkorders",
                    localField: "_id",
                    foreignField: "integrationsMasterId",
                    as: "DFWorkOrders"
                }
            },
            {
                $lookup: {
                    from: "snowworkorders",
                    localField: "_id",
                    foreignField: "integrationsMasterId",
                    as: "SNOWWorkOrders"
                }
            },
            {
                $lookup: {
                    from: "integrationsexceptions",
                    localField: "_id",
                    foreignField: "integrationsMasterId",
                    as: "integrationsExceptions"
                }
            },
            {
                $addFields: {
                    sourceWorkOrders: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$from", "CPD"] }, then: "$CPDWorkOrders" },
                                { case: { $eq: ["$from", "DF"] }, then: "$DFWorkOrders" },
                                { case: { $eq: ["$from", "SNOW"] }, then: "$SNOWWorkOrders" }
                            ],
                            default: [] // handle default case if needed
                        }
                    },
                    destinationWorkOrders: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$to", "CPD"] }, then: "$CPDWorkOrders" },
                                { case: { $eq: ["$to", "DF"] }, then: "$DFWorkOrders" },
                                { case: { $eq: ["$to", "SNOW"] }, then: "$SNOWWorkOrders" }
                            ],
                            default: [] // handle default case if needed
                        }
                    }
                }
            },
            {
                $project: {
                    CPDWorkOrders: 0,
                    DFWorkOrders: 0,
                    SNOWWorkOrders: 0
                }
            },
            ...(priorityQuery || fromDateQuery || searchQuery ? [
                {
                    $addFields: {
                        sourceWorkOrders: {
                            $filter: {
                                input: "$sourceWorkOrders",
                                as: "order",
                                cond: {
                                    $and: [
                                        ...(priorityQuery ? [{ $eq: ["$$order.priority", priorityQuery] }] : []),
                                        ...(fromDateQuery ? [
                                            { $gte: ["$$order.createdAt", fromDateQuery] },
                                            { $lte: ["$$order.createdAt", toDateQuery] }
                                        ] : []),
                                        ...(searchQuery ? [
                                            {
                                                $regexMatch: {
                                                    input: {
                                                        $switch: {
                                                            branches: [
                                                                {
                                                                    case: { $eq: ["$from", "CPD"] },
                                                                    then: "$$order.CPDWorkOrders.WorkOrderNumber"
                                                                },
                                                                {
                                                                    case: { $eq: ["$from", "DF"] },
                                                                    then: "$$order.DFWorkOrders.numberAlt"
                                                                },
                                                                {
                                                                    case: { $eq: ["$from", "SNOW"] },
                                                                    then: "$$order.SNOWWorkOrders.number"
                                                                }
                                                            ],
                                                            default: "" // handle default case if needed
                                                        }
                                                    },
                                                    regex: searchQuery
                                                }
                                            }
                                        ] : [])
                                    ]
                                }
                            }
                        },
                        destinationWorkOrders: {
                            $filter: {
                                input: "$destinationWorkOrders",
                                as: "order",
                                cond: {
                                    $and: [
                                        ...(priorityQuery ? [{ $eq: ["$$order.priority", priorityQuery] }] : []),
                                        ...(fromDateQuery ? [
                                            { $gte: ["$$order.createdAt", fromDateQuery] },
                                            { $lte: ["$$order.createdAt", toDateQuery] }
                                        ] : []),
                                        ...(searchQuery ? [
                                            {
                                                $regexMatch: {
                                                    input: {
                                                        $switch: {
                                                            branches: [
                                                                {
                                                                    case: { $eq: ["$to", "CPD"] },
                                                                    then: "$$order.CPDWorkOrders.WorkOrderNumber"
                                                                },
                                                                {
                                                                    case: { $eq: ["$to", "DF"] },
                                                                    then: "$$order.DFWorkOrders.numberAlt"
                                                                },
                                                                {
                                                                    case: { $eq: ["$to", "SNOW"] },
                                                                    then: "$$order.SNOWWorkOrders.number"
                                                                }
                                                            ],
                                                            default: "" // handle default case if needed
                                                        }
                                                    },
                                                    regex: searchQuery
                                                }
                                            }
                                        ] : [])
                                    ]
                                }
                            }
                        }
                    }
                }
            ] : []),
            {
                $addFields: {
                    integrationsExceptions: {
                        $filter: {
                            input: "$integrationsExceptions",
                            as: "exception",
                            cond: {
                                $and: [
                                    ...(fromDateQuery ? [
                                        { $gte: ["$$exception.createdAt", fromDateQuery] },
                                        { $lte: ["$$exception.createdAt", toDateQuery] }
                                    ] : [])
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    sourceWorkOrdersCount: { $size: "$sourceWorkOrders" },
                    destinationWorkOrdersCount: { $size: "$destinationWorkOrders" },
                    integrationsExceptionsCount: { $size: "$integrationsExceptions" }
                }
            }
        ]);


        sixWeeksSalesGraph = await integrationsMasterModel.aggregate([
            {
                $match: {
                    accountId: new mongoose.Types.ObjectId(req.params.accountId),
                    ...(integrationsQuery !== 'all-integrations' && {
                        _id: new mongoose.Types.ObjectId(integrationsQuery)
                    })
                }
            },
            {
                $lookup: {
                    from: "cpdworkorders",
                    localField: "_id",
                    foreignField: "integrationsMasterId",
                    as: "CPDWorkOrders"
                }
            },
            {
                $lookup: {
                    from: "dfworkorders",
                    localField: "_id",
                    foreignField: "integrationsMasterId",
                    as: "DFWorkOrders"
                }
            },
            {
                $lookup: {
                    from: "snowworkorders",
                    localField: "_id",
                    foreignField: "integrationsMasterId",
                    as: "SNOWWorkOrders"
                }
            },
            {
                $lookup: {
                    from: "integrationsexceptions",
                    localField: "_id",
                    foreignField: "integrationsMasterId",
                    as: "integrationExceptions"
                }
            },
            {
                $addFields: {
                    sourceWorkOrders: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$from", "CPD"] }, then: "$CPDWorkOrders" },
                                { case: { $eq: ["$from", "DF"] }, then: "$DFWorkOrders" },
                                { case: { $eq: ["$from", "SNOW"] }, then: "$SNOWWorkOrders" }
                            ],
                            default: [] // handle default case if needed
                        }
                    },
                    destinationWorkOrders: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$to", "CPD"] }, then: "$CPDWorkOrders" },
                                { case: { $eq: ["$to", "DF"] }, then: "$DFWorkOrders" },
                                { case: { $eq: ["$to", "SNOW"] }, then: "$SNOWWorkOrders" }
                            ],
                            default: [] // handle default case if needed
                        }
                    }
                }
            },

            {
                $project: {
                    CPDWorkOrders: 0,
                    DFWorkOrders: 0,
                    SNOWWorkOrders: 0
                }
            },
            {
                $addFields: {
                    sixWeekSales: sixWeekSales.map(week => ({
                        fromDate: week.fromDate,
                        toDate: week.toDate,
                        sourceWorkOrdersCount: {
                            $size: {
                                $filter: {
                                    input: "$sourceWorkOrders",
                                    as: "order",
                                    cond: {
                                        $and: [
                                            { $gte: ["$$order.createdAt", new Date(week.fromDate)] },
                                            { $lte: ["$$order.createdAt", new Date(week.toDate)] }
                                        ]
                                    }
                                }
                            }
                        },
                        destinationWorkOrdersCount: {
                            $size: {
                                $filter: {
                                    input: "$destinationWorkOrders",
                                    as: "order",
                                    cond: {
                                        $and: [
                                            { $gte: ["$$order.createdAt", new Date(week.fromDate)] },
                                            { $lte: ["$$order.createdAt", new Date(week.toDate)] }
                                        ]
                                    }
                                }
                            }
                        },
                        integrationExceptionCount: {
                            $size: {
                                $filter: {
                                    input: "$integrationExceptions",
                                    as: "exception",
                                    cond: {
                                        $and: [
                                            { $gte: ["$$exception.createdAt", new Date(week.fromDate)] },
                                            { $lte: ["$$exception.createdAt", new Date(week.toDate)] }
                                        ]
                                    }
                                }
                            }
                        }
                    }))
                }
            },
            {
                $project: {
                    sixWeekSales: 1
                }
            }
        ]);
    }
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ACCOUNT_INTEGRATION_REPORTS_FILTERS_RECEIVED,
        data: {
            accountReports,
            sixWeeksSalesGraph
        },
    })
});

/**
 * Validate the integration and account status in active.
 * Validate that workOrderId exist.
 */

exports.ValidateAccountAndIntegrationsStatus = asyncWrapper(async (req,res, next) => {
    const { accountId,integrationsMasterId, workOrderId } = req.query;
    const verifyAccountStatus = await integrationsMasterModel.findById(integrationsMasterId).populate('accountId')
    console.log('verifyAccountStatus')
    if (verifyAccountStatus.accountId.status === 'deleted' || verifyAccountStatus.accountId.status === 'in-progress') {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
        });
    }
    if(verifyAccountStatus.status === 'deleted' || verifyAccountStatus.status === 'blocked'){
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_MIDDLEWARE,
        });
    }
    if(!workOrderId){
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_WORK_ORDER_LIFE_CYCLE_VALIDATION,
        });
    }
    next()
})

/**
 * Get all work orders life cycles based on accountId, integrationsMasterId, workOrderId.
 */

exports.getWorkOrderLifeCycle = asyncWrapper(async (req, res) => {
    const { accountId, integrationsMasterId, workOrderId } = req.query;
    const integrationMaster = await integrationsMasterModel.findById(integrationsMasterId);
    let workOrderLifeCyclSourceAndDestinationeDetails=await getSourceAndDestinationWOLifeCycle(accountId, integrationsMasterId, integrationMaster.from,integrationMaster.to,workOrderId)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_WORK_ORDER_LIFE_CYCLE,
        workOrderLifeCycleDetails:workOrderLifeCyclSourceAndDestinationeDetails.workOrderLifeCycleDetails,
        sourceWorkorders:workOrderLifeCyclSourceAndDestinationeDetails.sourceWorkOrderDetails,
        destinationWorkOrders:workOrderLifeCyclSourceAndDestinationeDetails.destinationWorkOrderDetails
    })
})