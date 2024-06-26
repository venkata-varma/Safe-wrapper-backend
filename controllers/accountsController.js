// const axios = require('axios');
const accountsModel = require('../models/accountsModels/accountsModel');
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
const {sixWeekSales, convertStrToDate}=require('../utils/sixWeekSalesFunction')
const {getImageUrl}=require('../utils/fileUpload')




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
    else {
        next()
    }
})


/*
If middleware returns true, this function is to create a New Account along with one New User
Returns newly created Account with one associated user.
*/
exports.createAccount = asyncWrapper(async (req, res) => {
    const baseUrl = req.protocol + '://' + req.get('host');
    console.log("req.body", req.body)
    console.log('req.file', req.file)
    console.log('imageUrl')
    res.json({
        body:req.body,
        file:req.file,
        imageUrl:baseUrl + `/static/${req.file.originalname}`
    })
    // const { accountName, companyName, email, phone, password, status } = req.body
    // const accountDetails = await accountsModel.findOne({ $or: [{ email }, { phone }] })
    // if (accountDetails) {
    //     return res.status(409).json({
    //         status: customConstants.messages.MESSAGE_FAIL,
    //         message: customConstants.messages.MESSAGE_ACCOUNT_EXIST
    //     })
    // }
    // else {
    //     req.body.password = await hashPwd(password)
    //     const accountData = await accountsModel.create(req.body)
    //     const customId = new mongoose.Types.ObjectId();

    //     const user = await usersModel.create({
    //         _id: customId,
    //         userId: customId,
    //         createdBy: customId,
    //         accountId: accountData._id,
    //         name: accountName,
    //         password: req.body.password,
    //         companyName: companyName,
    //         phone: phone,
    //         email: email,
    //         role: 'super-admin',
    //     });
    //     //To delete Password from Response while displaying it.
    //     delete accountData._doc.password;
    //     delete user._doc.password;

    //     return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
    //         status: customConstants.messages.MESSAGE_SUCCESS,
    //         message: customConstants.messages.MESSAGE_ACCOUNT_CREATED,

    //     })
    // }
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
    const {accountId} = req.params
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
    const {accountId} = req.params
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
                localField: 'accountId',
                foreignField: 'accountId',
                as: 'CPDWorkOrderDetails'
            }
        },
        {
            $lookup: {
                from: 'dfworkorders',
                localField: 'accountId',
                foreignField: 'accountId',
                as: 'DFWorkOrderDetails'
            }
        },
        {
            $project: {
                CPDWorkOrderCount: { $size: '$CPDWorkOrderDetails' },
                DFWorkOrderCount: { $size: '$DFWorkOrderDetails' }
            }
        },
        {
            $project: {
                workOrders: [
                    { serviceprovider: 'CPD', workOrders: '$CPDWorkOrderCount' },
                    { serviceprovider: 'DF', workOrders: '$DFWorkOrderCount' }
                ]
            }
        },
        {
            $unwind: '$workOrders'
        },
        {
            $replaceRoot: { newRoot: '$workOrders' }
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
            integrationsServiceProvidersWorkOrdersCount
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
    const toDateQuery = req.query.toDate ? new Date(req.query.toDate) : (fromDateQuery ? new Date() : null);
    const searchQuery = req.query.search ? new RegExp(`${req.query.search}`, 'i') : null;
    var accountReports=[];
    var sixWeeksSalesGraph=[];
    if(integrationsQuery==='null' ||!integrationsQuery){
        console.log('wtf 1')
        accountReports=[]
        sixWeeksSalesGraph=[];
    }else if(integrationsQuery){

        console.log('wtf 2')
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
                from: "integrationsexceptions",
                localField: "_id",
                foreignField: "integrationsMasterId",
                as: "integrationsExceptions"
            }
        },

        /**
         * Lets say, There are other service providers , like SNOW, MGP etc; are to be added in either "from"  or "to"
         * So,  There is a need to make next query dynamic when more work-order models arrive ,
            which is applying If-else on "from" and "to", and then assigning to "sourceWorkOrders" and "destinationWorkOrders respectively" 
          */
        {
            $addFields: {
                sourceWorkOrders: {
                    $cond: {
                        if: { $eq: ["$from", "CPD"] },
                        then: "$CPDWorkOrders",
                        else: "$DFWorkOrders"
                    }
                },
                destinationWorkOrders: {
                    $cond: {
                        if: { $eq: ["$to", "CPD"] },
                        then: "$CPDWorkOrders",
                        else: "$DFWorkOrders"
                    }
                }
            }
        },
        {
            $project: {
                CPDWorkOrders: 0,
                DFWorkOrders: 0
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
                                                    $cond: {
                                                        if: { $eq: ["$from", "CPD"] },
                                                        then: "$$order.CPDWorkOrders.WorkOrderNumber",
                                                        else: "$$order.DFWorkOrders.numberAlt"
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
                                                    $cond: {
                                                        if: { $eq: ["$to", "CPD"] },
                                                        then: "$$order.CPDWorkOrders.WorkOrderNumber",
                                                        else: "$$order.DFWorkOrders.numberAlt"
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

                }
            },

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
        },
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
                from: "integrationsexceptions",
                localField: "_id",
                foreignField: "integrationsMasterId",
                as: "integrationExceptions"
            }
        },
        {
            $addFields: {
                sourceWorkOrders: {
                    $cond: {
                        if: { $eq: ["$from", "CPD"] },
                        then: "$CPDWorkOrders",
                        else: "$DFWorkOrders"
                    }
                },
                destinationWorkOrders: {
                    $cond: {
                        if: { $eq: ["$to", "CPD"] },
                        then: "$CPDWorkOrders",
                        else: "$DFWorkOrders"
                    }
                }
            }
        },
        
        {
            $project: {
                CPDWorkOrders: 0,
                DFWorkOrders: 0
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
                                        { $gte: ["$$order.createdAt", convertStrToDate(week.fromDate)] },
                                        { $lte: ["$$order.createdAt", convertStrToDate(week.toDate)] }
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
                                        { $gte: ["$$order.createdAt", convertStrToDate(week.fromDate)] },
                                        { $lte: ["$$order.createdAt", convertStrToDate(week.toDate)] }
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
                                        { $gte: ["$$exception.createdAt", convertStrToDate(week.fromDate)] },
                                        { $lte: ["$$exception.createdAt", convertStrToDate(week.toDate)] }
                                    ]
                                }
                            }
                        }
                    }
                }))
            }
        }, 
        {
            $project:{
                sixWeekSales:1
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
})