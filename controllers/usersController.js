// const axios = require('axios');
const usersModel = require('../models/usersModel');
const authentication = require('../utils/authentication');
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../config/constants.json');
const sessionsModel = require('../models/sessionsModel');
const { hashPwd, comparePassword } = require('../utils/helpers');



exports.validateUserRegistration = asyncWrapper(async (req, res, next) => {
    const { name, companyName, email, phone, role, password } = req.body
    if (name === "" || companyName === "" || email === "" || role ==="" || phone === "" || password === "") {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_MANDATORY_FIELDS
        });
    }
    else {
        next()
    }
})


exports.createUser = asyncWrapper(async (req, res) => {
    const { companyName, email, phone, password, status, createdBy, updatedBy } = req.body
    const userDetails = await usersModel.findOne({ $or: [{ email }, { phone }] })
    console.log(password, "password")
    if (userDetails) {
        return res.status(409).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_EXIST
        })
    }
    else {
        // req.body.userId = userData._id
        req.body.password = await hashPwd(password)
        const userData = await usersModel.create(req.body)
        // const accountDetails = await usersModel.create(req.body)
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_USER_CREATED,
            // data: userData
        })
    }
});


exports.loginUser = asyncWrapper(async (req, res) => {
  const { phone, password } = req.body;
  let user_details = {};

  try {
    // Find user by email or phone
    const user = await usersModel.findOne({ $or: [{ email: phone }, { phone: phone }] });

    // If user not found
    if (!user) {
      return res.status(401).json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_INVALID,
      });
    }

    // Find user details without password and _id fields
    const userData = await usersModel.findById(user.userId, { password: 0, _id: 0 });
console.log(!userData, "userData");

    // If userData not found
    if (!userData) {
      return res.status(401).json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_INVALID,
      });
    }

    user_details.accountDetails = userData;
    user_details.userDetails = user.toObject();
    user_details.userDetails.companyName = userData.companyName;

    console.log(password, user.password , "oooooool");
    
    // Compare password
    const comparePasswordResult = await comparePassword(password, user.password);
console.log(comparePasswordResult , "comparePasswordResult");

    // If password does not match
    if (!comparePasswordResult) {
      return res.status(401).json({
        status: customConstants.messages.MESSAGE_FAIL,
        message: customConstants.messages.MESSAGE_INVALID,
      });
    }

    // Generate JWT token
    const jwtToken = await user.getJWTToken();
    const jwtTokenExpires = await user.getJWTTokenExpireDate(jwtToken);

    // Create session
    req.body.accessToken = jwtToken;
    req.body.expirationTime = jwtTokenExpires.exp;
    req.body.userId = user._id;

    const sesssionDetails = await sessionsModel.create(req.body);
    user_details.sesssionDetails = sesssionDetails;

    // Return success response
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_USER_LOGIN,
      data: user_details,
    });
  } catch (error) {
    // Handle errors
    console.error("Error:", error);
    return res.status(500).json({
      status: customConstants.statusCodes.INTERNAL_SERVER_ERROR,
      message: customConstants.messages.MESSAGE_INTERNAL_SERVER_ERROR,
      error: error.message,
    });
  }
});

