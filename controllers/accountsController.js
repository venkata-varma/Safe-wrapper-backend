// const axios = require('axios');
const accountsModel = require('../models/accountsModel');
const authentication = require('../utils/authentication');
const asyncWrapper = require('../middleware/asyncWrapper');
const customConstants = require('../config/constants.json');
const { hashPwd } = require('../utils/helpers');
const usersModel = require('../models/usersModel');
const mongoose=require("mongoose")


exports.validateAccountRegistration = asyncWrapper(async (req, res, next) => {
    const { accountName, companyName, email, phone, password } = req.body
    console.log(accountName, companyName, email, phone, password,"okkkkk");
    if (accountName === "" || companyName === "" || email === "" || phone === "" || password === "") {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_MANDATORY_FIELDS
        });
    }
    else {
        next()
    }
})


exports.createAccount = asyncWrapper(async (req, res) => {
    const { accountName, companyName, email, phone, password, status } = req.body
    const accountDetails = await accountsModel.findOne({ $or: [{ email }, { phone }] })
   // console.log(req.body)
    if (accountDetails) {
        return res.status(409).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_EXIST
        })
    }
    else {  
        req.body.password = await hashPwd(password)
        const accountData = await accountsModel.create(req.body)
        console.log("accountData", accountData)
        // req.body.accountId = accountData._id
        // const accountDetails = await accountsModel.create(req.body)
        const customId=new mongoose.Types.ObjectId()
        const user = await usersModel.create({
            _id:customId,
            createdBy:customId,
            accountId:accountData._id,
            name:accountName,
            password:req.body.password,
            companyName:companyName,
            phone:phone,
            email:email,
            role:'super-admin',
        });
        console.log("User", user)
    //    await usersModel.findByIdAndUpdate(user._id,{  $set:{createdBy:user._id,updatedBy:user._id}},{new:true});
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_ACCOUNT_CREATED,
             data: {
                customId,
                accountData,
                user
             }
        })
    }
});