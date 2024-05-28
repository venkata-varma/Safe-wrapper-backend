// const axios = require('axios');
const usersModel = require('../models/usersModel');
const authentication = require('../utils/authentication');
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../config/constants.json');
const sessionsModel = require('../models/sessionsModel');
const { hashPwd, comparePassword } = require('../utils/helpers');
const accountsModel = require('../models/accountsModel');
const mongoose = require('mongoose')

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
    return res.status(409).json({
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
    return res.status(401).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_FIELDS_MANDATORY,
    });
  }
  const user = await usersModel.findOne({ phone }).populate('accountId');
  
  // If user not found
  if (!user) {
    return res.status(401).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_PHONE_NOT_EXISTS,
    });
  }
  if (user.accountId.status === 'deleted') {
    return res.status(401).json({
      status: customConstants.messages.MESSAGE_FAIL,
      message: customConstants.messages.MESSAGE_PREVENT_LOGIN_ACCOUNT_DELETED,
    });
  }

  // Compare password 
  const comparePasswordResult = await comparePassword(password, user.password);
  console.log(comparePasswordResult, "comparePasswordResult");

  // If password does not match
  if (!comparePasswordResult) {
    return res.status(401).json({
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
  const user = await usersModel.findOne({ phone }, { _id: 0, password: 0, userId: 0 });
  const respectiveAccount = await accountsModel.findOne({ _id: user.accountId },{password: 0});
  const userData = await usersModel.findOne({ phone });

  user_details.accountDetails = respectiveAccount;
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

  // Return success response
  return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_USER_LOGIN,
    data: user_details,
  });


});

