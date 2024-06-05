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
      message: customConstants.messages.MESSAGE_ACCOUNT_EXIST
    })
  }
  else {
    const customId = new mongoose.Types.ObjectId()
    req.body.password = await hashPwd(password)
    const userData = await usersModel.create({
      ...req.body,
      _id: customId,
      userId: customId
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
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_FIELDS_MANDATORY,
    });
  }
  const user = await usersModel.findOne({ phone }).populate('accountId');
  
  // If user not found
  if (!user) {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_PHONE_NOT_EXISTS,
    });
  }
  if (user.accountId.status === 'deleted') {
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
  const { phone, password } = req.body;
  let user_details = {};
  // Find user by email or phone
  const user = await usersModel.findOne({ phone }, { _id: 0, password: 0 });
  // const respectiveAccount = await accountsModel.findOne({ _id: user.accountId }, { password: 0 });
  const userData = await usersModel.findOne({ phone });

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
  user_details.accountDetails = await accountsModel.findById(user.accountId, {password:0})
  console.log('--------------------->', user_details)
  
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
  const  accountId  = req.params.accountId;
  const accountDetails = await accountsModel.findById(accountId);

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
        "as": "integrationsmasterserviceproviders"
      }
    },
    {
      $lookup: {
        "from": "integrationsfieldmappings",
        "localField": "_id",
        "foreignField": "integrationsMasterId",
        "as": "integrationsfieldmappings"
      }
    },
    {
      $lookup: {
        "from": "integrationssettings",
        "localField": "_id",
        "foreignField": "integrationsMasterId",
        "as": "integrationssettings"
      }
    }
  ]);

  // for (let integrationMaster of integrationsOfAccount) {
  //   let integrationServiceProvidersOfRespectiveIntegration = await integrationMasterServiceProviderModel.find({ integrationsMasterId: integrationMaster._id })
  //   let integraionFieldMappingOfRespectiveIntegration = await integrationFieldMappingModel.find({ integrationsMasterId: integrationMaster._id });
  //   let integrationSettingsOfRespectiveIntegration = await integrationSettingsModel.find({ integrationsMasterId: integrationMaster._id });
  //   integrationDetails = {
  //     integrationMaster,
  //     integraionFieldMappingOfRespectiveIntegration,
  //     integrationServiceProvidersOfRespectiveIntegration,
  //     integrationSettingsOfRespectiveIntegration
  //   }
  //   integrationsDetails.push(integrationDetails)
  // }

  const activityLog = await integrationCronsModel.aggregate([
    {
      $match: { accountId: new mongoose.Types.ObjectId(accountId) }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $lookup: {
        "from": "cpdworkorders",
        "localField": "_id",
        "foreignField": "integrationsCronId",
        "as": "cronInfo"
      }
    },
    { $unwind: "$cronInfo" },
    {
      $sort: { "cronInfo.createdAt": -1 }
    }
  ]);

  // const activityLog = await cpdWorkOrdersModel.find({ accountId }).sort({ createdAt: -1 })

  const highPrioritycpdWorkOrders = await cpdWorkOrdersModel.find({ accountId, priority:'high' }).sort({ createdAt: -1 })
  const workOrderStates = await cpdWorkOrdersModel.aggregate([
    {
      $match: {
        accountId: new mongoose.Types.ObjectId(accountId)
      }
    },
    {
      $group: {
        _id: "$CPDWorkOrders.Status",
        count: { $sum: 1 }  // Count the number of documents in each group
      }
    }
  ])
  const twelveWeekSales = twelveWeeksSales;


  for (let week of twelveWeekSales) {

    let weekWorkOrders = await cpdWorkOrdersModel.find({ accountId, createdAt: { $gte: week.fromDate, $lte: week.toDate } })

    week.workOrderCount = weekWorkOrders.length;
  }
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_DASHBOARD_STATISTICS_RECEIVED,
    data: {
       
      users,
      workOrderStates,
      highPrioritycpdWorkOrders,
      activityLog,
      twelveWeekSales,
      integrationsOfAccount

    },


  });

})