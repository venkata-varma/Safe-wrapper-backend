// const axios = require('axios');
const usersModel = require('../models/usersModel');
const authentication = require('../utils/authentication');
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../config/constants.json');
const sessionsModel = require('../models/sessionsModel');



exports.validateUserRegistration = asyncWrapper(async (req, res, next) => {
    console.log(req.body,"okkkkk");
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
    const { companyName, email, phone, password, status } = req.body
    const userDetails = await usersModel.findOne({ $or: [{ email }, { phone }] })
    console.log(req.body)
    if (userDetails) {
        return res.status(409).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_EXIST
        })
    }
    else {
        const userData = await usersModel.create(req.body)
        req.body.userId = userData._id
        const accountDetails = await usersModel.create(req.body)
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_USER_CREATED,
            data: userData
        })
    }
});


exports.validateuser = asyncWrapper(async (req, res) => {
    const { phone, password } = req.body
    let userDetails = {}

    const user = await usersModel.findOne({ $or: [{ email: phone }, { phone: phone }] });
    console.log(user, "user");
    const userData = await usersModel.findById(user.userId, { password: 0, _id: 0 });
    userDetails.userRegestrionDetails = userData
    userDetails.user = user.toObject()
    userDetails.user.companyName = userData.companyName
    if (!user || user.password !== password) {
        return res.status(401).json({ status: customConstants.messages.MESSAGE_FAIL, message: customConstants.messages.MESSAGE_INVALID });
    }
    //insert data into sessions
    const jwtToken = await user.getJWTToken();
    const jwtTokenExpires = await user.getJWTTokenExpireDate(jwtToken);
    req.body.accessToken = jwtToken;
    req.body.expirationTime = jwtTokenExpires.exp;
    req.body.userId = user._id

    let sesssionDetails = await sessionsModel.create(req.body)
    userDetails.sesssionDetails = sesssionDetails

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_USER_LOGIN,
        data: userDetails
    });
});

