// const axios = require('axios');
const usersModel = require('../../models/usersModel');
const authentication = require('../../utils/authentication');
const asyncWrapper = require('../../middleware/asyncWrapper');
const customConstants = require('../../config/constants.json');
const sessionsModel = require('../../models/sessionsModel');
const { hashPwd, comparePassword, twelveWeeksSales } = require('../../utils/helpers');
const accountsModel = require('../../models/accountsModel');
const mongoose = require('mongoose')

const { validateUserMobileEmailData, validatePhoneNumber } = require('../../utils/userLoginValidation');
let { getAllWebhookPayoadHeadersOfAccountFn } = require("./webHooksController")
const accountSettingsModel = require('../../models/accountSettingsModel');
const { deleteAccount } = require('./accountsController');

/*
Miidleware function to controller, "createUser"
Mandatory fields -> Name, Company name, Email, Role, Phone ,Password
Funtion to check existence of mandatory fields in payload
If returns True, moves to "next" function , "createUser"
*/
exports.validateUserRegistration = asyncWrapper(async (req, res, next) => {
  const { name, email, phone, role, password } = req.body
  if (!name || !email || !phone || !password) {
    return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_MANDATORY_FIELDS
    });
  }
  if (!await validatePhoneNumber(phone)) {
    return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_PHONE_NUMBER_VALIDATE
    });
  }
  if (!['super-admin', 'merchant'].includes(req.user.role)) {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_SESSION_NO_ACCESS_TO_ADD_USER,
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
  const { name, email, phone, role, password, createdBy } = req.body
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
      role: req.user.accountId.accountType === "super-admin" ? "admin" : req.user.accountId.accountType === "merchant" ? "manager" : "manager",
      userId: customId,
      createdBy: req.body.createdBy, //Super-admin user among set 0f 4 -5 users
      accountId: req.user.accountId || null

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
  if (!['merchant', 'super-admin'].includes(req.user.role)) {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_SESSION_NO_ACCESS_TO_DELETE_USER,
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
exports.updateUserStatus = asyncWrapper(async (req, res) => {
  // const deactivateUser = await usersModel.findByIdAndUpdate(req.params.userId, { $set: { status: 'deleted', updatedBy: req.user_id } }, { new: true });
  // delete deactivateUser.password;
  let userDetails
  const { status } = req.body
  if (status === 'delete') {
    userDetails = await usersModel.findByIdAndUpdate(req.params.userId, { $set: { status: 'deleted', updatedBy: req.user_id } }, { new: true });
    delete userDetails.password
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_USER_DELETED,
    })
  }
  else if (status === 'active') {
    userDetails = await usersModel.findByIdAndUpdate(req.params.userId, { $set: { status: 'active', updatedBy: req.user_id } }, { new: true });
    delete userDetails.password
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_USER_ACTIVATED,
    })
  }
  // Return success response
  // return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
  //   status: customConstants.messages.MESSAGE_SUCCESS,
  //   message: customConstants.messages.MESSAGE_USER_DELETED,
  //   data: deactivateUser,
  // });
})

/**
 * Function to get the details of the spectific user
 * Input -> @params User Id 
 
 */
exports.getUserDetails = asyncWrapper(async (req, res) => {

  const user = await usersModel.findOne({ _id: req.params.userId }, { password: 0 }).lean()
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
exports.getAllUsers = asyncWrapper(async (req, res) => {
  // const users = await usersModel.find({ accountId: req.params.accountId, role:{$eq:req.user.role === "super-admin"} }, { password: 0 });
  console.log('req.user.role:===', req.user.role)
  const users = await usersModel.find(
    {
      accountId: req.params.accountId,
      role: req.user.role === "super-admin" ? { $in: ["super-admin", "admin", "merchant"] } : req.user.role === "merchant" ? { $in: ["manager", "merchant"] } : { $eq: "manager" }
    },
    { password: 0 }
  );

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
 * * If user matches with main account, it gets changed in main account too. 
 * Or else, It changes in respective user.
 * @params userId
 */
exports.updateUserDetails = asyncWrapper(async (req, res) => {
  const user = await usersModel.findById(req.params.userId).lean()

  const mainUser = await accountsModel.findOne({ accountId: user.accountId, phone: user.phone, email: user.email });

  var updateAccount;
  var updateUser;
  if (mainUser) {

    updateAccount = await accountsModel.findOneAndUpdate({ _id: mainUser._id }, { $set: { accountName: req.body.name, ...req.body } }, { new: true, runValidators: true })
    updateUser = await usersModel.findByIdAndUpdate(req.params.userId, { $set: { ...req.body, updatedBy: req.user._id } }, { new: true });

  } else if (!mainUser) {

    updateUser = await usersModel.findByIdAndUpdate(req.params.userId, { $set: { ...req.body, updatedBy: req.user._id } }, { new: true, runValidators: true });

  }
  const userObject = updateUser.toObject();
  delete userObject.password;
  console.log("updateUser-delete password", userObject);
  // Return success response
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_USER_DETAILS_UPDATED,
    data: {
      userObject
    }
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

  const { mobileEmail, password } = req.body;

  if (!mobileEmail || !password) {
    return res.status(customConstants.statusCodes.BAD_REQUEST).json({
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
  if (["super-admin"].includes(user.role)) {
    return res.status(customConstants.statusCodes.FORBIDDEN).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_ONLY_CUSTOMER_ENTRY,
    });
  }
  if (['in-progress', 'blocked'].includes(user.accountId.status)) {
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



  //const accountUpdateIntegrationsCount = await accountsModel.findByIdAndUpdate(user.accountId, { $set: { noOfIntegrations: integrationsCount.length } }, { new: true })
  user_details.accountDetails = await accountsModel.findById(user.accountId, { password: 0 })
  user_details.accountSettings = await accountSettingsModel.findOne({ accountId: user.accountId })

  // Return success response
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_USER_LOGIN,
    data: user_details,
  });


});

/*
If middleware returns True, this function create session with valid JWT token
Mandatory fields -> Phone and Password 
*/
exports.loginUserForSwagger = asyncWrapper(async (req, res) => {

  const { mobileEmail, password, sessionExpirationTime } = req.body;
  let user_details = {};
  // Find user by email or phone
  const user = await usersModel.findOne({ $or: [{ phone: mobileEmail }, { email: mobileEmail }] }, { _id: 0, password: 0 });
  // const respectiveAccount = await accountsModel.findOne({ _id: user.accountId }, { password: 0 });
  const userData = await usersModel.findOne({ $or: [{ phone: mobileEmail }, { email: mobileEmail }] });

  user_details.userDetails = user.toObject();

  // Generate JWT token
  const jwtToken = await userData.getJWTToken(sessionExpirationTime);
  const jwtTokenExpires = await userData.getJWTTokenExpireDate(jwtToken);

  // Create session
  req.body.accessToken = jwtToken;
  req.body.expirationTime = jwtTokenExpires.exp;
  req.body.userId = userData._id;
  req.body.accountId = userData.accountId;

  const sesssionDetails = await sessionsModel.create(req.body);
  user_details.sesssionDetails = sesssionDetails;
  user_details.accountDetails = await accountsModel.findById(user.accountId, { password: 0 })

  if (userData.authUser === "OnePOS") {
    await onePosLogsModel.create({
      accountId: userData.accountId,
      userId: userData._id,
      apiCalled: req.url,
      authenticationCount: 1,
      expirationTime: new Date((req.body.expirationTime) * 1000)
    })
  }


  let usefulDetails = await getAllWebhookPayoadHeadersOfAccountFn(req.body.accountId)

  // Return success response
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_USER_LOGIN,
    data: {
      accountId: req.body.accountId,
      access_token: sesssionDetails.accessToken,
      usefulDetails
    }
  });
});





/*
Miidleware function to validate user and password
Mandatory fields -> Phone and Password
Funtion to check 
  1.Mandatorys status of Account, 
  2.Validation of credentials, password
If returns True, moves to "next" function , "updatePassword"
*/
exports.middlewareToUpdatePassword = asyncWrapper(async (req, res, next) => {
  // console.log("Rweq", req.body)
  const { userId } = req.params
  const { currentPassword, newPassword } = req.body;

  const user = await usersModel.findById(userId).populate('accountId')
  // If user not found
  if (!user) {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_PHONE_NOT_EXISTS,
    });
  }
  // if (user.accountId.status === 'in-progress') {
  //   return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
  //     status: customConstants.messages.MESSAGE_FAIL,
  //     message: customConstants.messages.MESSAGE_PREVENT_LOGIN_ACCOUNT_IN_PROGRESS,
  //   });
  // }
  if (user.accountId.status === 'deleted' || user.status === 'deleted') {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_PREVENT_LOGIN_ACCOUNT_DELETED,
    });
  }

  console.log(currentPassword, "comparePasswordResult");
  console.log(user.password, "user.password");
  // Compare password 
  const comparePasswordResult = await comparePassword(currentPassword, user.password);
  console.log(comparePasswordResult, "comparePasswordResult");

  // If password does not match
  if (!comparePasswordResult) {
    return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_WRONG_CURRENT_PASSWORD,
    });
  }
  next()

})

/**
 * Update the user password.
 * If user matches with main account, it gets changed in main account too. 
 * Or else, It changes in respective user.
 * @params userId
 */

exports.updatePassword = asyncWrapper(async (req, res) => {

  const { userId } = req.params;
  const user = await usersModel.findById(req.params.userId).lean()

  const mainUser = await accountsModel.findOne({ accountId: user.accountId, phone: user.phone, email: user.email });

  const { currentPassword, newPassword } = req.body;
  let updatedPassword = await hashPwd(newPassword)
  var updateAccountPassword;
  var updateUserPassword
  if (mainUser) {
    updateAccountPassword = await accountsModel.findOneAndUpdate({ _id: mainUser._id }, { $set: { password: updatedPassword } }, { new: true, runValidators: true })
    updateUserPassword = await usersModel.findByIdAndUpdate(userId, { password: updatedPassword }, { new: true, runValidators: true })
  } else if (!mainUser) {
    updateUserPassword = await usersModel.findByIdAndUpdate(userId, { password: updatedPassword }, { new: true, runValidators: true })
  }



  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_PASSWORD_UPDATED,
  });
})