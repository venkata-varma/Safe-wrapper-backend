const accountsModel = require('../../models/accountsModels/accountsModel');
const asyncWrapper = require('../../middleware/asyncWrapper')
const customConstants = require('../config/customConstants.json');
const {validatePhoneNumber} = require('../../utils/userLoginValidation')
const { hashPwd, comparePassword } = require('../../utils/helpers')
const usersModel = require('../../models/usersModels/usersModel')
const mongoose = require('mongoose')
const integrationsMasterModel=require('../../models/integrationsMasterModels/integrationsMasterModel');
const accountSettingsModel = require('../../models/accountsModels/accountSettingsModel');
/*
Miidleware function to controller, "createAccount"
Mandatory fields ->  AccountName, CompanyName, Email, Phone, Password, City, State, Pincode, Country
If returns True, moves to "next" function,-> "createAccount"
*/
exports.validateAccountRegistration = asyncWrapper(async (req, res, next) => {
   console.log('reqoriginal', req.originalUrl.includes('super-admin'))
    const { accountName, companyName, email, phone, password, city, state, pincode, country, accountType } = req.body;

    //console.log(accountName, companyName, email, phone, password,"okkkkk");
    if (!accountName || !companyName || !email || !phone || !password || !accountType || !city || !state || !country || !pincode   )  {
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
            message: customConstants.messages.MESSAGE_PHONE_NUMBER_VALIDATE  // Might need to use API to validate Phone number
        });
    }
    else {

        next()
    }
})

/**
 * Function to create super-admin account
 * Account Type=super-admin
 */


exports.superAdminAccountRegister = asyncWrapper(async (req, res) => {
    const baseUrl = process.env.DOMAIN_NAME;
    const { accountName, companyName, email, phone, password } = req.body
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
            status:"active",
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

        //To delete Password from Response while displaying it.
        delete accountData._doc.password;
        delete user._doc.password;

        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_ACCOUNT_CREATED,

        })
    }


})


/**
 * Function to get all accounts
 * 
 */
exports.getAllAccounts = asyncWrapper(async (req, res) => {
    const allAccounts = await accountsModel.find({}, {password:0});

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_ALL_ACCOUNTS,
        data: {
            count:allAccounts.length,
            allAccounts
        }
    })
})

/**
 * Function to update "Account status"
 * @params AccountId
 * Returns Updated account record
 */
exports.updateAccountStatus=asyncWrapper(async(req,res)=>{
    const updateAccountStatus=await accountsModel.findOneAndUpdate({_id:req.params.accountId}, {$set:{status:req.body.status}},{new:true,runValidators:true})


    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ACCOUNT_STATUS_UPDATED,
        data: {
            updateAccountStatus
        }
    })

})




/**
 * Function to get all integrations of respective account
 * @params AccountId
 * 
 */
exports.getAllIntegrations=asyncWrapper(async(req,res)=>{
    const allIntegrations=await integrationsMasterModel.find({accountId:req.params.accountId});


    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ALL_INTEGRATIONS_OF_ACCOUNT,
        data: {
            count:allIntegrations.length,
            allIntegrations
        }
    })
})

/**
 * Function to update settings of account
 * @params AccountId
 * 
 * 
 */
exports.updateAccountSettings=asyncWrapper(async(req,res)=>{
   
const updateAccountSettings=await accountSettingsModel.findOneAndUpdate({accountId:req.params.accountId}, req.body, {new:true, runValidators:true})

return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
    status: customConstants.messages.MESSAGE_SUCCESS,
    message: customConstants.messages.MESSAGE_UPDATE_ACCOUNT_SETTINGS,
    data: {
        updateAccountSettings
    }
})


})