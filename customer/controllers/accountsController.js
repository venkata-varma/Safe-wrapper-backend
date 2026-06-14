// const axios = require('axios');
const accountsModel = require('../../models/accountsModel');
const accountSettingsModel = require('../../models/accountSettingsModel')
const authentication = require('../../utils/authentication');
const asyncWrapper = require('../../middleware/asyncWrapper');
const customConstants = require('../../config/constants.json');
const { hashPwd } = require('../../utils/helpers');
const usersModel = require('../../models/usersModel');
const mongoose = require("mongoose")

const { validatePhoneNumber } = require('../../utils/userLoginValidation');

const path = require('path');
const { preSignedUrlToUpload } = require('../../utils/fileUpload');
const { decryptData } = require('../../utils/encryptionAlgorithms');


exports.uploadImageToS3 = asyncWrapper(async (req, res) => {
    const getImageUrl = await preSignedUrlToUpload(req.file)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_IMAGE_UPLOAD,
        data: getImageUrl
    })
})

/*
Miidleware function to controller, "createAccount"
Mandatory fields ->  AccountName, CompanyName, Email, Phone, Password, City, State, Pincode, Country
If returns True, moves to "next" function,-> "createAccount"
*/
exports.validateAccountRegistration = asyncWrapper(async (req, res, next) => {
    const { accountName, companyName, email, phone, password, location } = req.body;


    if (!accountName || !companyName || !email || !phone || !password ) {
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
    const accountDetails = await usersModel.findOne({ $or: [{ email }, { phone }] })
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
            role: "admin",

            logo: req.file ? await preSignedUrlToUpload(req.file) : ""
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
            role: "admin",
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

/*
* Verify the status of account and phone number..
* If status is active pass the middleware.
*/
exports.validateAccountForUpdate = asyncWrapper(async (req, res, next) => {
    const { accountId } = req.params
    const verifyAccountStatus = await accountsModel.findById(accountId)
    const reqAccountType = req.user.accountId.accountType
    if (!verifyAccountStatus) {
        return res.status(409).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_PHONE_NOT_EXISTS
        })
    }
    if (!req.body.phone) {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ENTER_MOBILENUMBER,
        });
    }
    if (verifyAccountStatus.status !== 'active' && reqAccountType === 'customer') {
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
 * Update account details.
 */

exports.updateAccount = asyncWrapper(async (req, res) => {
    const baseUrl = process.env.DOMAIN_NAME;
    const { accountId } = req.params
    const { accountName, companyName, phone, } = req.body

    // req.body.logo = req.file ? `${baseUrl}devapps/Integration-assets/${req.file.filename}` : (await accountsModel.findById(accountId,{logo:1})).logo
    req.body.logo = req.file ? await preSignedUrlToUpload(req.file) : (await accountsModel.findById(accountId, { logo: 1 })).logo

    const accountDetails = await accountsModel.findByIdAndUpdate(accountId, {
        ...req.body,
    }, { new: true }); const updateUserDetails = await usersModel.findOneAndUpdate({ accountId: new mongoose.Types.ObjectId(accountId), phone: phone }, {
        $set: { name: accountName }
    }, { new: true })
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ACCOUNT_UPDATED,
        data: accountDetails
    })

})

/**
 * API end-point not used . On permission, this API end-point to be removed or to be optimised
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

    const verifyAccountStatus = await accountsModel.findById({ _id: new mongoose.Types.ObjectId(accountId) })
    const reqAccountType = req.user.accountId.accountType

    if (!verifyAccountStatus || verifyAccountStatus.status !== 'active' && reqAccountType === 'customer') {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
        });
    }
    else {
        next()
    }
});





exports.getAccountIntegrationDetails = asyncWrapper(async (req, res) => {
    let { accountId } = req.params;
    let accountDetails = await accountsModel.findOne({ accountId }).select('-password')

    let integrationsConnected = accountDetails?.integrationsConnected
    let integrationsOfAccount = []
    integrationsOfAccount = integrationsConnected.map((eachIntegration) => {

        if (eachIntegration?.status === true) {
            return eachIntegration?.integration
        }
    })

    let squarePOSDetails = {}
    let cardConnectDetails = {}
    if (integrationsOfAccount.includes("card-connect")) {
        let cardConnectCredentials = await accountsModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(accountId)
                }
            },
            {
                $lookup: {
                    from: "cardconnectintegrationscredentials",
                    localField: "_id",
                    foreignField: "accountId",
                    as: "cardconnectintegrationscredentials"
                }
            },
            {
                $lookup: {
                    from: "cardconnectintegrationssettings",
                    localField: "_id",
                    foreignField: "accountId",
                    as: "cardconnectintegrationssettings"
                }
            },
            {
                $unwind: {
                    path: "$cardconnectintegrationscredentials",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: "$cardconnectintegrationssettings",
                    preserveNullAndEmptyArrays: true
                }
            },
        ])

        cardConnectDetails.credentials = cardConnectCredentials?.[0]?.cardconnectintegrationscredentials
        cardConnectDetails.settings = cardConnectCredentials?.[0]?.cardconnectintegrationssettings

        if (cardConnectDetails?.credentials?.credentials) {
            let encryptedData = cardConnectDetails?.credentials?.credentials

            let encrypted = { iv: process.env.CRYPTO_IV, encryptedData };
            let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
            cardConnectDetails.credentials.credentials = decryptConfigCredentials;

        }



    }
    if (integrationsOfAccount.includes("square-pos")) {
        let squarePOSCredentials = await accountsModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(accountId)
                }
            },
            {
                $lookup: {
                    from: "squareposcredentialsmodels",
                    localField: "_id",
                    foreignField: "accountId",
                    as: "squareposcredentials"
                }
            },
            {
                $lookup: {
                    from: "squareposintegrationssettings",
                    localField: "_id",
                    foreignField: "accountId",
                    as: "squareposintegrationssettings"
                }
            },
            {
                $unwind: {
                    path: "$squareposcredentials",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: "$squareposintegrationssettings",
                    preserveNullAndEmptyArrays: true
                }
            }
        ])

        squarePOSDetails.credentials = squarePOSCredentials?.[0]?.squareposcredentials
        squarePOSDetails.settings = squarePOSCredentials?.[0]?.squareposintegrationssettings
        if (squarePOSDetails?.credentials?.credentials) {
            let encryptedData = squarePOSDetails?.credentials?.credentials

            let encrypted = { iv: process.env.CRYPTO_IV, encryptedData };
            let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
            squarePOSDetails.credentials.credentials = decryptConfigCredentials;

        }



    }

    let responseData = [
        {
            ...accountDetails?._doc,
            cardConnectDetails: cardConnectDetails,
            squarePOSDetails: squarePOSDetails
        }

    ]


    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.ACCOUNT_INTEGRATIONS_CONNECTIONS_DETAILS,
        data: responseData
    });
});





/**
 * 
 */
exports.getMerchantsNamesInDropdown = asyncWrapper(async (req, res, next) => {

    let merchantNames;
    if (req.user.accountId.accountType === 'super-admin') {

        merchantNames = await accountsModel.aggregate([
            {
                $match: {
                    status: "active",

                    accountName: { $nin: ["", null] },
                    $expr: { $eq: [{ $type: "$accountName" }, "string"] }
                }
            },

            {
                $group: {
                    _id: "$_id",                // group by unique record id
                    merchantName: { $first: "$accountName" }
                }
            },
            {
                $project: {
                    _id: 0,
                    objectId: "$_id",           // keep original _id as objectId
                    merchantName: 1
                }
            }
        ])
    } else if (req.user.accountId.accountType === 'merchant') {

        let accountDetails = req.user.accountId   //(Populated object)
        merchantNames = [{
            merchantName: accountDetails?.accountName,
            objectId: accountDetails?._id
        }];
    }

    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MERCHANT_MERCHANT_NAMES_IN_DROPDOWN,
            data: {

                merchantNames
            },
        });





})
