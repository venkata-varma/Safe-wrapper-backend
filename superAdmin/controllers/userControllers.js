const accountsModel = require('../../models/accountsModel');
const usersModel = require('../../models/usersModel')
const asyncWrapper = require('../../middleware/asyncWrapper')
const { validateUserMobileEmailData, validatePhoneNumber } = require('../../utils/userLoginValidation')
const { hashPwd, comparePassword } = require('../../utils/helpers')
const customConstants = require('../config/customConstants.json')
const sessionsModel = require('../../models/sessionsModel');
const onePosLogsModel = require('../../models/onePosLogsModel');


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
  if (req.originalUrl.includes("super-admin")&& user.accountId.accountType !== 'super-admin') {
    return res.status(customConstants.statusCodes.FORBIDDEN).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_SUPER_ADMIN_ENTRY,
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
exports.loginUserForSwagger = asyncWrapper(async (req, res) => {
  console.log('Requwest:====',req.url)
  const { mobileEmail, password,setExpirationForSession } = req.body;
  let user_details = {};
  // Find user by email or phone
  const user = await usersModel.findOne({ $or: [{ phone: mobileEmail }, { email: mobileEmail }] }, { _id: 0, password: 0 });
  // const respectiveAccount = await accountsModel.findOne({ _id: user.accountId }, { password: 0 });
  const userData = await usersModel.findOne({ $or: [{ phone: mobileEmail }, { email: mobileEmail }] });

  user_details.userDetails = user.toObject();

  // Generate JWT token
  const jwtToken = await userData.getJWTToken(setExpirationForSession);
  const jwtTokenExpires = await userData.getJWTTokenExpireDate(jwtToken);

  // Create session
  req.body.accessToken = jwtToken;
  req.body.expirationTime = jwtTokenExpires.exp;
  req.body.userId = userData._id;
  req.body.accountId = userData.accountId;

  const sesssionDetails = await sessionsModel.create(req.body);
  user_details.sesssionDetails = sesssionDetails;
  user_details.accountDetails = await accountsModel.findById(user.accountId, { password: 0 })

  if(userData.authUser === "OnePOS"){ 
    await onePosLogsModel.create({
      accountId:userData.accountId,
      userId:userData._id,
      apiCalled:req.url,
      authenticationCount:1,
      expirationTime: new Date((req.body.expirationTime)*1000)
    })
  }
  

  // Return success response
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_USER_LOGIN,
    data:{
      // accountId:req.body.accountId,
      access_token:sesssionDetails.accessToken
    }
  });
});








/*
If middleware returns True, this function create session with valid JWT token
Mandatory fields -> Phone and Password 
*/
exports.superAdminLogin = asyncWrapper(async (req, res) => {
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
  //  const integrationsCount = await integrationMasterModel.find({ accountId: user.accountId, status: 'active' });
  //const accountUpdateIntegrationsCount = await accountsModel.findByIdAndUpdate(user.accountId, { $set: { noOfIntegrations: integrationsCount.length } }, { new: true })
  user_details.accountDetails = await accountsModel.findById(user.accountId, { password: 0 })


  // Return success response
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_USER_LOGIN,
    data: user_details,
  });


});
