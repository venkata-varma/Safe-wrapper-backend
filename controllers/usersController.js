// const axios = require('axios');
const usersModel = require('../models/usersModels/usersModel');
const authentication = require('../utils/authentication');
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../config/constants.json');
const sessionsModel = require('../models/sessionModels/sessionsModel');
const { hashPwd, comparePassword, twelveWeeksSales } = require('../utils/helpers');
const accountsModel = require('../models/accountsModels/accountsModel');
const mongoose = require('mongoose')
const cpdWorkOrdersModel = require('../models/workOrdersModels/CPDWorkordersModel')
const integrationMasterModel = require('../models/integrationsMasterModels/integrationsMasterModel')
const integrationMasterServiceProviderModel = require('../models/integrationsMasterModels/integrationsMasterServiceProvidersModel')
const integrationFieldMappingModel = require('../models/integrationsMasterModels/integrationsFieldMappingModel');
const integrationSettingsModel = require('../models/integrationsMasterModels/integrationsSettingsModel')
const integrationCronsModel = require('../models/integrationsMasterModels/integrationsCronsModel');
const CPDWorkordersModel = require('../models/workOrdersModels/CPDWorkordersModel');
const integrationsExceptionModel = require('../models/integrationsMasterModels/integrationsExceptionsModel')
const dfWorkOrdersModel = require('../models/workOrdersModels/DFWorkOrdersModel')
const serviceProviderListModel = require('../models/integrationsMasterModels/serviceProviderList')
const { validateUserMobileEmailData, validatePhoneNumber } = require('../utils/userLoginValidation');
const { getStatusOfWorkOrders } = require('../utils/general');
const integrationsExceptionsModel = require('../models/integrationsMasterModels/integrationsExceptionsModel');
const integrationsMasterModel = require('../models/integrationsMasterModels/integrationsMasterModel');

/*
Miidleware function to controller, "createUser"
Mandatory fields -> Name, Company name, Email, Role, Phone ,Password
Funtion to check existence of mandatory fields in payload
If returns True, moves to "next" function , "createUser"
*/
exports.validateUserRegistration = asyncWrapper(async (req, res, next) => {
  const { name, companyName, email, phone, role, password } = req.body
  if (!name || !companyName || !email || !role || !phone || !password) {
    return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_MANDATORY_FIELDS
    });
  }
  if(!await validatePhoneNumber(phone)){
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
Function to create user by Admin or by self- need to be discussed
Mandatory fields -> Name, Company name, Email, Role, Phone ,Password
Returns newly created user

*/
exports.createUser = asyncWrapper(async (req, res) => {
  const { name, companyName, email, phone, role, password, createdBy } = req.body
  const userDetails = await usersModel.findOne({ $or: [{ email }, { phone }] })
  console.log(password, "password")
  if (userDetails) {
    return res.status(customConstants.statusCodes.DATA_CONFLICAT).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_USER_EXIST
    })
  }
  else {
    const customId = new mongoose.Types.ObjectId()
    req.body.password = await hashPwd(password)
    const userData = await usersModel.create({
      ...req.body,
      _id: customId,
      userId: customId,
      createdBy: req.body.createdBy //Super-admin user among set 0f 4 -5 users
      //accountId:req.user.accountId

    })
    delete userData._doc.password;
    // const accountDetails = await usersModel.create(req.body)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_USER_CREATED,
      data: userData
    })
  }
});


/**
  *Middleware function to check whether account and user are active before proceeding to delete
  *If middleware is passed, Function call is passed to update status of user to "Deleted".
  *If successful, returns updated record.
*/
exports.middlewareToDeleteUser = asyncWrapper(async (req, res, next) => {
  const checkAccount = await accountsModel.findOne({ _id: req.user.accountId }).lean();
  if (checkAccount.status === 'deleted') {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
    });
  }
  if (req.user.status === 'deleted') {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_USER_ALREADY_DELETED,
    });
  }
  next()
}

)


/** 
  *Function to delete user 
  *PATCH route to update the status of user to "deleted"
  *Route to be provided only to Admin; Not accessible by user by self.
   *If successful, returns updated record.

*/
exports.deleteUser = asyncWrapper(async (req, res) => {
  const deactivateUser = await usersModel.findByIdAndUpdate(req.params.userId, { $set: { status: 'deleted', updatedBy:req.user_id } }, { new: true });
  delete deactivateUser.password;
  // Return success response
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_USER_DELETED,
    data: deactivateUser,
  });
})

/**
 * Function to get the details of the spectific user
 * Input -> @params User Id 
 
 */
exports.getUserDetails = asyncWrapper(async (req, res) => {
  const user = await usersModel.findById(req.params.userId, { password: 0 }).lean()
  // Return success response
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_USER_DETAILS,
    data: user,
  });

})

/**
 * Function to get all users of account
 *@params "accountId" 
 * 
 */
exports.getAllUsers=asyncWrapper(async(req,res)=>{
  const users=await usersModel.find({accountId:req.params.accountId},{password : 0}) ;
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_ALL_USERS_DETAILS,
    data: {
      users
    },
  });
  
})



/**
 * Middleware function to check status of user before updating details
 * If passed , Funnction call will be passed to next actual function to save the updates.
 */
exports.middlewareUpdateUserDetails = asyncWrapper(async (req, res, next) => {
  const userStatusCheck = await usersModel.findById(req.params.userId);
  console.log('userStatusCheck', userStatusCheck)
  if (userStatusCheck.status === 'deleted') {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_USER_STATUS_IS_DELETED,
    });
  }
  next()
})

/**
 * Function to update details of user
 * @params User Id
 */
exports.updateUserDetails = asyncWrapper(async (req, res) => {
  const updateUser = await usersModel.findByIdAndUpdate(req.params.userId, { $set: { ...req.body, updatedBy: req.user._id } }, { new: true });

  // Return success response
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_USER_DETAILS_UPDATED,
    data: updateUser,
  });

})


/*
Miidleware function to controller, "loginUser"
Mandatory fields -> Phone and Password
Funtion to check 
  1.Existence of mandatory fields, 
  2.Mandatorys status of Account, 
  3.Validation of credentials, password
If returns True, moves to "next" function , "loginUser"
*/
exports.validateLoginProcess = asyncWrapper(async (req, res, next) => {
  console.log("Rweq", req.body)
  const { mobileEmail, password } = req.body;

  if (!mobileEmail || !password) {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_FIELDS_MANDATORY,
    });
  }
  let validatedUserMobileAndEmailData = validateUserMobileEmailData(req.body);
  if (validatedUserMobileAndEmailData.error) {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      message: customConstants.messages.MESSAGE_REQUEST_BODY_ERROR,
      status: customConstants.messages.MESSAGE_FAIL,
      error: validatedUserMobileAndEmailData.error.details
    });
  }
  const user = await usersModel.findOne({ $or: [{ phone: mobileEmail }, { email: mobileEmail }] }).populate('accountId');

  // If user not found
  if (!user) {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_PHONE_NOT_EXISTS,
    });
  }
  if (user.accountId.status === 'in-progress') {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_PREVENT_LOGIN_ACCOUNT_IN_PROGRESS,
    });
  }
  if (user.accountId.status === 'deleted' || user.status === 'deleted') {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_PREVENT_LOGIN_ACCOUNT_DELETED,
    });
  }

  // Compare password 
  const comparePasswordResult = await comparePassword(password, user.password);
  console.log(comparePasswordResult, "comparePasswordResult");

  // If password does not match
  if (!comparePasswordResult) {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_WRONG_PASSWORD,
    });
  }
  next()

})


/*
If middleware returns True, this function create session with valid JWT token
Mandatory fields -> Phone and Password 
*/
exports.loginUser = asyncWrapper(async (req, res) => {
  const { mobileEmail, password } = req.body;
  let user_details = {};
  // Find user by email or phone
  const user = await usersModel.findOne({ $or: [{ phone: mobileEmail }, { email: mobileEmail }] }, { _id: 0, password: 0 });
  // const respectiveAccount = await accountsModel.findOne({ _id: user.accountId }, { password: 0 });
  const userData = await usersModel.findOne({ $or: [{ phone: mobileEmail }, { email: mobileEmail }] });

  user_details.userDetails = user.toObject();

  // Generate JWT token
  const jwtToken = await userData.getJWTToken();
  const jwtTokenExpires = await userData.getJWTTokenExpireDate(jwtToken);

  // Create session
  req.body.accessToken = jwtToken;
  req.body.expirationTime = jwtTokenExpires.exp;
  req.body.userId = userData._id;
  req.body.accountId = userData.accountId;

  const sesssionDetails = await sessionsModel.create(req.body);
  user_details.sesssionDetails = sesssionDetails;

  //Count number of integrations for respective account
  const integrationsCount = await integrationMasterModel.find({ accountId: user.accountId, status: 'active' });
  //const accountUpdateIntegrationsCount = await accountsModel.findByIdAndUpdate(user.accountId, { $set: { noOfIntegrations: integrationsCount.length } }, { new: true })
  user_details.accountDetails = await accountsModel.findById(user.accountId, { password: 0 })


  // Return success response
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_USER_LOGIN,
    data: user_details,
  });


});


/*
  Function to scan and provide all possible data and statistics of respective- logged in Account
  Retunrs data of a account- 
    1. Number of Integrations
    2. Integration details 
    3. Latest Cron-logs with their respective dumped and pulled records
    4. Sales report of last 12 weeks 
    5. High-priority work-orders
    6. List of users associated with the account
    7. Account details
*/
exports.getAccountStatistics = asyncWrapper(async (req, res) => {
  const accountId = req.params.accountId;
  const accountDetails = await accountsModel.findById(accountId, { password: 0 }).lean();

  const users = await usersModel.find({ accountId }, { password: 0 });

  // const integrationsOfAccount = await integrationMasterModel.find({ accountId, status: 'active' });

  const integrationsOfAccount = await integrationMasterModel.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
        status: 'active'
      }
    },
    {
      $lookup: {
        "from": "integrationsmasterserviceproviders",
        "localField": "_id",
        "foreignField": "integrationsMasterId",
        "as": "integrationsMasterServiceProviders"
      }
    },
    {
      $lookup: {
        "from": "integrationsfieldmappings",
        "localField": "_id",
        "foreignField": "integrationsMasterId",
        "as": "integrationsFieldMappings"
      }
    },
    {
      $lookup: {
        "from": "integrationssettings",
        "localField": "_id",
        "foreignField": "integrationsMasterId",
        "as": "integrationsSettings"
      }
    }, {
      $lookup: {
        "from": "integrationsexceptions",
        "localField": "_id",
        "foreignField": "integrationsMasterId",
        "as": "integrationsExceptions"
      }
    },
    {
      $addFields: {
        integrationsExceptionsCount: { $size: "$integrationsExceptions" }
      }
    }
  ]);

  // for (let exceptionsCount of integrationsOfAccount) {
  //   exceptionsCount.integrationsExceptionsCount = exceptionsCount.integrationsExceptions.length;
  // }
/*
  const activityLog = await CPDWorkordersModel.aggregate([
    {
      $match: { accountId: new mongoose.Types.ObjectId(accountId) }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $lookup: {
        "from": "integrationscrons",
        "localField": "integrationsCronId",
        "foreignField": "_id",
        "as": "cronInfo"
      }
    },
    { $unwind: "$cronInfo" },
    {
      $sort: { "cronInfo.createdAt": -1 }
    }
  ]);
  console.log('activityLog:==',activityLog)
  */
  const activityLog = await integrationCronsModel.find({ accountId }).sort({ createdAt: -1 }).limit(10)
  
  const getDefaultStatus = await serviceProviderListModel.findOne({ serviceProviders: "CPD" })
  const highPrioritycpdWorkOrders = await cpdWorkOrdersModel.find({ accountId, $or: [{ priority: 'high' }, { priority: 'medium' }] }).sort({ createdAt: -1 })
  let sourceStatus = await CPDWorkordersModel.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId),
      }
    },
    {
      $group: {
        _id: '$CPDWorkOrderStatus',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        count: 1
      }
    }
  ]);
  let workOrderStates = await getStatusOfWorkOrders(getDefaultStatus.workOrderStatus,sourceStatus);

  const integrationsExceptionsApiservices = await integrationsExceptionsModel.aggregate([
    { $match: { accountId: new mongoose.Types.ObjectId(accountId)
        }
    },
    { $group:
      { _id: '$integrationsApiServices', 
        count: { $sum: 1 }
      }
    }
]);

// Get all source and destination work orders
  const getAllWorkOrdersCount = async (accountId, serviceprovider) => {
    let workOrdersCount = 0
        if (serviceprovider === "CPD") {
          workOrdersCount += await cpdWorkOrdersModel.find({ accountId: accountId }).countDocuments();
        } else if (serviceprovider === "DF") {
          workOrdersCount += await dfWorkOrdersModel.find({ accountId: accountId }).countDocuments();
        }
    return workOrdersCount
  }

  const getIntegrationsOfAccount = await integrationsMasterModel.find({ accountId: accountId });
  let totalSourceWorkOrdersCount = 0, totalDestinationWorkOrdersCount = 0;

  // Loop each integration to get all work orders related to account
  for (let integration of getIntegrationsOfAccount) {
    let sourceCounts = await getAllWorkOrdersCount(accountId, integration.from);
    let destinationCounts = await getAllWorkOrdersCount(accountId, integration.to);

    totalSourceWorkOrdersCount += sourceCounts;
    totalDestinationWorkOrdersCount += destinationCounts;
  }
  
  const exceptionsCount = await integrationsExceptionModel.find({accountId:accountId}).countDocuments()
  accountDetails.insightsWorkOrdersCount = {
    sourceWorkOrdersCount : totalSourceWorkOrdersCount,
    destinationWorkOrdersCount : totalDestinationWorkOrdersCount,
    exceptionsCount : exceptionsCount
  }

  const twelveWeekSales = twelveWeeksSales;


  for (let week of twelveWeekSales) {

    let weekCPDkWorkOrders = await cpdWorkOrdersModel.find({ accountId, createdAt: { $gte: new Date(week.fromDate), $lte: new Date(week.toDate) } }).countDocuments()
    let weekDFWorkOrders = await dfWorkOrdersModel.find({ accountId, createdAt: { $gte: new Date(week.fromDate), $lte: new Date(week.toDate) } }).countDocuments()
    let integrationsExceptions = await integrationsExceptionModel.find({ accountId, createdAt: { $gte: new Date(week.fromDate), $lte: new Date(week.toDate) } }).countDocuments()
    week.CPDWorkOrderCount = weekCPDkWorkOrders;
    week.dfWorkOrderCount = weekDFWorkOrders;
    week.integrationsExceptions = integrationsExceptions;
  }
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_DASHBOARD_STATISTICS_RECEIVED,
    data: {
      accountDetails,
      users,
      workOrderStates,
      highPrioritycpdWorkOrders,
      activityLog,
      twelveWeekSales,
      integrationsOfAccount,
      integrationsExceptionsApiservices

    },


  });

})