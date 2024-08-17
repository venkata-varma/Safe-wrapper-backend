// const axios = require('axios');
const accountsModel = require('../../models/accountsModel');
const accountSettingsModel = require('../../models/accountSettingsModel')
const authentication = require('../../utils/authentication');
const asyncWrapper = require('../../middleware/asyncWrapper');
const customConstants = require('../../config/constants.json');
const { hashPwd } = require('../../utils/helpers');
const usersModel = require('../../models/usersModel');
const mongoose = require("mongoose")
const integrationsMasterModel = require('../../models/integrationsMasterModel');
const CPDWorkordersModel = require('../../models/CPDWorkordersModel');
const DFWorkOrdersModel = require('../../models/DFWorkOrdersModel');
const integtationExceptionsModel = require('../../models/integrationsExceptionsModel');
const integrationCronsModel = require('../../models/integrationsCronsModel');
const { sixWeekSales } = require('../../utils/sixWeekSalesFunction');
const workOrderLifeCycleModel = require('../../models/workOrderLifeCycleModel');
const { validatePhoneNumber } = require('../../utils/userLoginValidation');
const { getSourceAndDestinationWOLifeCycle, integationOfAccountWorkOrderReports } = require('../../utils/general')
const { workOrderLifeCycleReports, sixWeeksSalesDetails, mapNewUpdatedCounts,  } = require('../../utils/accountInsightUtils')

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
    const baseUrl = process.env.DOMAIN_NAME;
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
            accountId: accountData._id,
            timeZone: req.body.timeZone || "IST"
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
    const integrationExceptions = await integtationExceptionsModel.find({ accountId: accountId }).countDocuments();
    const integrationsActivitylogCount = await integrationCronsModel.find({ accountId: accountId }).countDocuments();

    let integrationsOfAccount = await integrationsMasterModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(accountId)
            }
        },
        {
            $lookup: {
                from: "integrationssettings",
                localField: "_id",
                foreignField: "integrationsMasterId",
                as: "integrationSettings"
            }
        },
        {
            $unwind: {
                path: "$integrationSettings",
                preserveNullAndEmptyArrays: true // This will keep documents without matching integrationSettings
            }
        },
        {
            $addFields: {
                statusFieldMappingKeys: "$integrationSettings.statusFieldMappingKeys"
            }
        },
        {
            $project: {
                integrationSettings: 0
            }
        },
        {
            $lookup: {
                from: "workorderlifecycles",
                localField: "_id",
                foreignField: "integrationsMasterId",
                as: "workorderlifecycles"
            }
        }
    ]);

    const workOrderReports = await integationOfAccountWorkOrderReports(integrationsOfAccount)
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
            integrationsOfAccount: workOrderReports,
            integrationExceptionsCount: integrationExceptions,
            dataSyncCount: integrationsActivitylogCount,
            failedCPDWorkOrders,
        },
    })
})


/**
 * Function to return reports of respective account with respective filters 
 * @params "accountId"
 */
exports.getAccountIntegrationsReports = asyncWrapper(async (req, res) => {
    const integrationsQuery = req.query.integration;
    const accountId = req.params.accountId;
    var sourceWorkOrderLifeCycleRecords, destinationWorkOrderLifeCycleRecords;
    var sourceWorkOrderLifeCycleCounts, destinationWorkOrderLifeCycleCounts
    var sixWeekLifeCycleDocs;
    // Retrieve query parameters
    const priorityQuery = req.query.priority ? req.query.priority.toLowerCase() : null;
    const fromDateQuery = req.query.fromDate ? new Date(req.query.fromDate) : null;
    const toDateQuery = req.query.toDate ? new Date(new Date(req.query.toDate).setDate(new Date(req.query.toDate).getDate() + 1)) : (fromDateQuery ? new Date() : null);
    const searchQuery = req.query.search ? new RegExp(`${(req.query.search).toString()}`, 'i') : null;

    // Define valid priority values
    const validPriorities = ['all', 'high', 'medium', 'low'];
    
    var accountReports = [];
    var sixWeeksSalesGraph = [];
   if (integrationsQuery === 'null' || !integrationsQuery) {
        accountReports = [];
        sixWeeksSalesGraph = [];
    } else if (integrationsQuery) {
        if (priorityQuery && !validPriorities.includes(priorityQuery)) {
            accountReports = [];
        } else {
            accountReports = await integrationsMasterModel.aggregate([
                {
                    $match: {
                        accountId: new mongoose.Types.ObjectId(req.params.accountId),
                        status: "active",
                      _id:new mongoose.Types.ObjectId(integrationsQuery)
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
            ]);
        }
    }

    if (accountReports.length > 0) {
        const integrationSource = accountReports[0].from;
        const integrationDestination = accountReports[0].to;

        sourceWorkOrderLifeCycleRecords = await workOrderLifeCycleReports(
            integrationSource, 
            integrationsQuery, 
            priorityQuery, 
            fromDateQuery, 
            toDateQuery, 
            searchQuery, 
            validPriorities, 
            accountId
        );

        destinationWorkOrderLifeCycleRecords = await workOrderLifeCycleReports(
            integrationDestination, 
            integrationsQuery, 
            priorityQuery, 
            fromDateQuery, 
            toDateQuery, 
            searchQuery, 
            validPriorities, 
            accountId
        );

        // Add the new properties to each item in accountReports
        accountReports = accountReports.map(report => ({
            ...report,
            sourceWorkOrderLifeCycleRecords,
            destinationWorkOrderLifeCycleRecords,
            sourceWorkOrderLifeCycleRecordsCount:sourceWorkOrderLifeCycleRecords.length,
            destinationWorkOrderLifeCycleRecordsCount:destinationWorkOrderLifeCycleRecords.length
        }));
    }
//six weeks sales graph code-----------------------------------------------------------------------------------------------------------
if(integrationsQuery){
  
    sixWeeksSalesGraph = await integrationsMasterModel.aggregate([
        {
            $match: {
                accountId: new mongoose.Types.ObjectId(req.params.accountId),
                status: "active",
                _id:new mongoose.Types.ObjectId(integrationsQuery)
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
            $lookup: {
                from: "integrationssettings",
                localField: "_id",
                foreignField: "integrationsMasterId",
                as: "integrationSettings"
            }
        },
        {
            $unwind: "$integrationSettings"
        },
        {
            $addFields: {
                statusFieldMappingKeys: "$integrationSettings.statusFieldMappingKeys"
            }
        },
        {
            $project: {
                integrationSettings: 0
            }
        },
        
    ])

if(sixWeeksSalesGraph.length>0){
    const integrationSource = sixWeeksSalesGraph[0].from;
    const integrationDestination = sixWeeksSalesGraph[0].to;
    sixWeekLifeCycleDocs=await sixWeeksSalesDetails(integrationSource,integrationDestination, integrationsQuery, accountId, sixWeeksSalesGraph[0].statusFieldMappingKeys ,sixWeeksSalesGraph[0].integrationExceptions) 
    sixWeekLifeCycleDocs=await mapNewUpdatedCounts(sixWeekLifeCycleDocs, sixWeeksSalesGraph[0].statusFieldMappingKeys, integrationSource,integrationDestination, )

      //destinationWorkOrderLifeCycleCounts=await sixWeeksSalesDetails(integrationDestination, integrationsQuery, accountId, sixWeeksSalesGraph[0].statusFieldMappingKeys)
      sixWeeksSalesGraph = sixWeeksSalesGraph.map(report => ({
        ...report,
        sixWeekLifeCycleDocs,

    }));

}

}





    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ACCOUNT_INTEGRATION_REPORTS_FILTERS_RECEIVED,
        data: {
            accountReports,

            sixWeeksSalesGraph: sixWeeksSalesGraph[0].sixWeekLifeCycleDocs
        },
    });
});

/**
 * Validate the integration and account status in active.
 * Validate that workOrderId exist.
 */

exports.ValidateAccountAndIntegrationsStatus = asyncWrapper(async (req, res, next) => {
    const { accountId, integrationsMasterId, workOrderId } = req.query;
    const verifyAccountStatus = await integrationsMasterModel.findById(integrationsMasterId).populate('accountId')
    console.log('verifyAccountStatus')
    if (verifyAccountStatus.accountId.status === 'deleted' || verifyAccountStatus.accountId.status === 'in-progress') {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
        });
    }
    if (verifyAccountStatus.status === 'deleted' || verifyAccountStatus.status === 'blocked') {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_INTEGRATION_MASTER_MIDDLEWARE,
        });
    }
    if (!workOrderId) {
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
    let integrationMaster = await integrationsMasterModel.findById(integrationsMasterId);

    let workOrderLifeCyclSourceAndDestinationeDetails = await getSourceAndDestinationWOLifeCycle(accountId, integrationsMasterId, integrationMaster.from, integrationMaster.to, workOrderId)
    if (workOrderLifeCyclSourceAndDestinationeDetails === "Invalid workorder id") {
        
    
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message:customConstants.messages.MESSAGE_WORKORDER_ID_INVALID,

        })
    }

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_WORK_ORDER_LIFE_CYCLE,
            sourceWorkOrderLifeCycleDetails: workOrderLifeCyclSourceAndDestinationeDetails.sourceWorkOrderLifeCycleDetails,
            destinationWorkOrderLifeCycleDetails: workOrderLifeCyclSourceAndDestinationeDetails.destinationWorkOrderLifeCycleDetails,
            sourceWorkorders: workOrderLifeCyclSourceAndDestinationeDetails.sourceWorkOrderDetails,
            destinationWorkOrders: workOrderLifeCyclSourceAndDestinationeDetails.destinationWorkOrderDetails
        })
    
})