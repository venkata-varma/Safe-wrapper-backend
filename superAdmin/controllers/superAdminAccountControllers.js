// const axios = require('axios');
const accountsModel = require('../../models/accountsModel');
const accountSettingsModel = require('../../models/accountSettingsModel')
const authentication = require('../../utils/authentication');
const asyncWrapper = require('../../middleware/asyncWrapper');
const customConstants = require('../../config/constants.json');
const { hashPwd } = require('../../utils/helpers');
const usersModel = require('../../models/usersModel');
const mongoose = require("mongoose")
const {
    encryptData,
    decryptData,
} = require("../../utils/encryptionAlgorithms");
const { validatePhoneNumber } = require('../../utils/userLoginValidation');

const path = require('path');
const { preSignedUrlToUpload } = require('../../utils/fileUpload');
const cardConnectExceptionsModel = require('../../cardConnect/models/cardConnectExceptionsModel');
const cardConnectTransactionsModel = require('../../cardConnect/models/cardConnectTransactionsModel');
const { getSixWeeksSalesFunction } = require('../../utils/sixWeeksTimeline');
const cardConnectIntegrationsCronsModel = require('../../cardConnect/models/cardConnectIntegrationsCronsModel');
let webhookMasterModel = require('../../models/webHooksMasterModel')
let cardConnectCredentialsModel = require('../../cardConnect/models/cardConnectIntegrationsCredentialsModel')
let cardConnectSettingsModel = require('../../cardConnect/models/cardConnectIntegrationsSettingsModel')
let squarePOSCredentialsModel = require('../../squarePOS/models/squarePOSCredentialsModel')

let squarePOSSettingsModel = require('../../squarePOS/models/squarePOSIntegrationSettingsModel')


let webhookMetaPayloadModel = require('../../models/webHookMetaPayloads')
let webhookPayloadHeadersModel = require('../../models/webhookPayloadHeaders')
let webhookPayloadTransactionsModel = require('../../models/webhookPayloadTransactions')




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

    if (!accountName || !companyName || !email || !phone || !password || !location) {
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
    next()
})



/**
 * 
 */
exports.validationMapMachinesToAccount = asyncWrapper(async (req, res, next) => {
    const { accountId, machines } = req.body
    if (!accountId) {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ID_MANDATORY
        });
    }
    const findAccount = await accountsModel.findOne({ accountId })
    if (!findAccount) {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_NOT_EXISTS
        })
    }



    if (!machines) {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_MACHINES_MANDATORY
        });
    }
    let machinesArray = machines.includes(',')
        ? machines.split(',').map((s) => s.trim())
        : [machines];
    let accountDetails = await accountsModel.find({
        machines: { $in: machinesArray },
        accountId: { $ne: new mongoose.Types.ObjectId(accountId) }
    }, { machines: 1 }); // only fetch machines field

    if (accountDetails.length > 0) {
        // Collect machines that are already taken
        let takenMachines = [];
        accountDetails.forEach(acc => {
            takenMachines.push(...acc.machines.filter(m => machinesArray.includes(m)));
        });

        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: `These machines are already taken: ${takenMachines.join(', ')}`,
            takenMachines // also send as array for frontend
        });
    }
    next()
})



/**
 * 
 */
exports.validationMapMachinesToAccountUpdate = asyncWrapper(async (req, res, next) => {
    const { accountId, machines } = req.body
    if (!accountId) {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ID_MANDATORY
        });
    }
    const findAccount = await accountsModel.findOne({ accountId })
    if (!findAccount) {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_NOT_EXISTS
        })
    }



    if (!machines) {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_MACHINES_MANDATORY
        });
    }
    let machinesArray = machines.includes(',')
        ? machines.split(',').map((s) => s.trim())
        : [machines];
    let accountDetails = await accountsModel.find({
        machines: { $in: machinesArray },
        _id: { $ne: accountId }
    }, { machines: 1 }); // only fetch machines field

    if (accountDetails.length > 0) {
        // Collect machines that are already taken
        let takenMachines = [];
        accountDetails.forEach(acc => {
            takenMachines.push(...acc.machines.filter(m => machinesArray.includes(m)));
        });

        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: `These machines are already taken: ${takenMachines.join(', ')}`,
            takenMachines // also send as array for frontend
        });
    }
    next()
})

/**
 * 
 */
exports.mapMachinesToAccount = asyncWrapper(async (req, res) => {
    let { accountId, machines } = req.body

    let updateAccount = await accountsModel.findByIdAndUpdate(accountId,
        {
            $set: {
                machines: machines.split(',').length > 0 ? machines.split(',') : machines,
                updatedBy: req.user._id
            }
        },
        { new: true, runValidators: true }
    )


    let machineArray = machines?.split(',')
    await Promise.all([
        webhookMetaPayloadModel.updateMany(
            { primaryHookId: { $in: machineArray } },
            { $set: { accountId } }
        ),
        webhookPayloadHeadersModel.updateMany(
            { serialNumber: { $in: machineArray } },
            { $set: { accountId } }
        ),
        webhookPayloadTransactionsModel.updateMany(
            { serialNumber: { $in: machineArray } },
            { $set: { accountId } }
        )
    ]);


    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_MACHINES_LINKING_SUCCESSFULL,
        data: {
            updateAccount
        }
    })
})


/*
If middleware returns true, this function is to create a New Account along with one New User
Returns newly created Account with one associated user.
*/
exports.createAccount = asyncWrapper(async (req, res) => {
    const baseUrl = process.env.DOMAIN_NAME;
    const { accountName, companyName, email, phone, password, status, } = req.body
    const accountDetails = await accountsModel.findOne({ $or: [{ email }, { phone }] })
    let userDetails = await usersModel.findOne({ $or: [{ email }, { phone }] })
    if (accountDetails || userDetails) {
        return res.status(customConstants.statusCodes.BAD_REQUEST).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_EXIST
        })
    }
    else {

        req.body.password = await hashPwd(password)
        const accountData = await accountsModel.create({
            ...req.body,
            accountType: "merchant",
            role: "merchant",
            logo: req.file ? await preSignedUrlToUpload(req.file) : "",
            createdBy: req.user._id
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
            role: "merchant",
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
            data: {
                accountData,
                user
            }

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
    //const reqAccountType = req.user.accountId.accountType
    const reqAccountType = verifyAccountStatus.accountType

    if (!verifyAccountStatus) {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_NOT_EXISTS
        })
    }
    // if (!req.body.phone) {
    //     return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
    //         status: customConstants.messages.MESSAGE_FAIL,
    //         message: customConstants.messages.MESSAGE_ENTER_MOBILENUMBER,
    //     });
    // }

    if (verifyAccountStatus.status !== 'active' && reqAccountType === 'merchant') {

        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
        });
    }


    next()

});






/**
 * Update account details.
 */

exports.updateAccount = asyncWrapper(async (req, res) => {
    const baseUrl = process.env.DOMAIN_NAME;
    const { accountId } = req.params
    const { accountName, companyName, phone, address, location, integrationsConnected } = req.body

    let findAccount = await accountsModel.findById(accountId);

    // req.body.logo = req.file ? `${baseUrl}devapps/Integration-assets/${req.file.filename}` : (await accountsModel.findById(accountId,{logo:1})).logo
    req.body.logo = req.file ? await preSignedUrlToUpload(req.file) : (await accountsModel.findById(accountId, { logo: 1 })).logo

    const accountDetails = await accountsModel.findByIdAndUpdate(accountId,
        {
            $set: {
                ...req.body,
                updatedBy: req.user._id
            }
        },
        { new: true });
    let updateUserDetails = await usersModel.findOneAndUpdate({ accountId: new mongoose.Types.ObjectId(accountId) }, {
        $set: { name: accountName }
    }, { new: true })

    updateUserDetails = await usersModel.findOneAndUpdate({ phone: findAccount.phone, }, { $set: { phone: req.body.phone, } }, { runValidators: true, new: true });

    updateUserDetails = await usersModel.findOneAndUpdate({ email: findAccount.email }, { $set: { email: req.body.email } }, { runValidators: true, new: true });

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_ACCOUNT_UPDATED,
        data: {
            accountData: accountDetails,
            user: updateUserDetails
        }
    })

})


/**
 * 
 */
exports.updateLinkedMachinesOfAccount = asyncWrapper(async (req, res) => {
    let { accountId, machines } = req.body


    const updatedAccountDetails = await accountsModel.findByIdAndUpdate(accountId,
        {
            $set: {

                machines: machines.split(',').length > 0 ? machines.split(',') : machines,
                updatedBy: req.user._id
            }
        },
        { new: true });


    let machineArray = machines?.split(',')
    await Promise.all([
        webhookMetaPayloadModel.updateMany(
            { primaryHookId: { $in: machineArray } },
            { $set: { accountId } }
        ),
        webhookPayloadHeadersModel.updateMany(
            { serialNumber: { $in: machineArray } },
            { $set: { accountId } }
        ),
        webhookPayloadTransactionsModel.updateMany(
            { serialNumber: { $in: machineArray } },
            { $set: { accountId } }
        )
    ]);


    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_LINKED_MACHINES_TO_ACCOUNT_UPDATED,
        data: updatedAccountDetails
    })



})



/**
 * API end-point not used . On permission, this API end-point to be removed or to be optimised
  *Function to delete account -Actually to Deactivate account by Admin
*/
exports.updateAccountStatus = asyncWrapper(async (req, res) => {
    const { status, accountId } = req.query
    const accountDetails = await accountsModel.findById(accountId).lean();
    if (status === 'delete' || status === 'deleted') {
        const updatedAccount = await accountsModel.findByIdAndUpdate(accountId, { $set: { status: 'deleted' } }, { new: true })
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_ACCOUNT_DELETED,
            data: updatedAccount,
        });
    }
    else if (status === 'active') {
        const updatedAccount = await accountsModel.findByIdAndUpdate(accountId, { $set: { status: 'active' } }, { new: true })
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_ACCOUNT_ACTIVATED,
            data: updatedAccount,
        });
    }

});

/*
* Verify the status of account.
* If status is active pass the middleware.
*/
exports.validateAccountStatus = asyncWrapper(async (req, res, next) => {
    const { accountId } = req.params

    const verifyAccountStatus = await accountsModel.findById({ _id: new mongoose.Types.ObjectId(accountId) })
    const reqAccountType = req.user.accountId.accountType

    if (!verifyAccountStatus || verifyAccountStatus.status !== 'active' && reqAccountType === 'merchant') {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
        });
    }
    else {
        next()
    }
});

exports.getAllMerchantAccounts = asyncWrapper(async (req, res) => {
    const accounts = await accountsModel.find({ accountType: "merchant" }, { password: 0 }).sort({ _id: -1 })
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_MERCHANT_ACCOUNTS,
        data: accounts
    })
})

exports.validateAccountStatus = asyncWrapper(async (req, res, next) => {
    const { accountId } = req.params

    const verifyAccountStatus = await accountsModel.findById(accountId)
    //const reqAccountType = req.user.accountId.accountType
    const reqAccountType = verifyAccountStatus.accountType

    if (!verifyAccountStatus) {
        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_NOT_EXISTS
        })
    }
    // if (!req.body.phone) {
    //     return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
    //         status: customConstants.messages.MESSAGE_FAIL,
    //         message: customConstants.messages.MESSAGE_ENTER_MOBILENUMBER,
    //     });
    // }

    if (verifyAccountStatus.status !== 'active') {

        return res.status(customConstants.statusCodes.UNAUTHORIZED).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_ACCOUNT_ALREADY_DELETED,
        });
    }


    next()
})



exports.getAccountIntegrationDetails = asyncWrapper(async (req, res) => {
    let { accountId } = req.params;
    let accountDetails = await accountsModel.findOne({ accountId }).select('-password')

    let integrationsConnected = accountDetails?.integrationsConnected

    let squarePOSDetails = {}
    let cardConnectDetails = {}
    if (integrationsConnected.includes("card-connect")) {
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
    if (integrationsConnected.includes("square-pos")) {
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






exports.getAllCardConnectExceptions = async (fromDate, toDate, paymentType) => {

    let getAllExceptions = await cardConnectExceptionsModel.aggregate([
        {
            $addFields: {
                paymentType: "card-connect"
            }
        },
        {
            $match: {
                createdAt: {
                    $gte: fromDate,
                    $lte: toDate
                }
            }
        },
        {
            $lookup: {
                from: "accounts",
                localField: "accountId",
                foreignField: "accountId",
                as: "accountRecord"
            }
        },
        {
            $unwind: "$accountRecord"
        },
        {
            $project: {
                "accountRecord.password": 0
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])


    return getAllExceptions




}




exports.getSuperAdminCardConnectDashboardStats = asyncWrapper(async (req, res) => {

    let getLastSiWeeksResult = getSixWeeksSalesFunction()

    const weeksArray = getLastSiWeeksResult.map(week => ({
        fromDate: new Date(week.fromDate),
        toDate: new Date(week.toDate)
    }));


    const fromDate = new Date(getLastSiWeeksResult[0].fromDate);
    const toDate = new Date(getLastSiWeeksResult[getLastSiWeeksResult.length - 1].toDate);


    let pipeline = await cardConnectTransactionsModel.aggregate([

        {
            $addFields: {
                transactionDate: {
                    $switch: {
                        branches: [
                            // Case: 14 digits (YYYYMMDDHHmmss)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        14
                                    ]
                                },
                                then: {
                                    $dateFromString: {
                                        dateString: {
                                            $concat: [
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 0, 4] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 4, 2] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 6, 2] }, "T",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 8, 2] }, ":",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 10, 2] }, ":",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 12, 2] }, "Z"
                                            ]
                                        }
                                    }
                                }
                            },
                            // Case: 8 digits (YYYYMMDD)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        8
                                    ]
                                },
                                then: {
                                    $dateFromString: {
                                        dateString: {
                                            $concat: [
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 0, 4] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 4, 2] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 6, 2] }, "T00:00:00Z"
                                            ]
                                        }
                                    }
                                }
                            },
                            // Case: epoch seconds (10 digits)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        10
                                    ]
                                },
                                then: {
                                    $toDate: {
                                        $multiply: [{ $toLong: { $ifNull: ["$responseObject.authdate", 0] } }, 1000]
                                    }
                                }
                            },
                            // Case: epoch millis (13 digits)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        13
                                    ]
                                },
                                then: {
                                    $toDate: { $toLong: { $ifNull: ["$responseObject.authdate", 0] } }
                                }
                            }
                        ],
                        // Default: fallback to responseObject.date
                        default: { $toDate: "$responseObject.date" }
                    }
                },
                transactionId: "$responseObject.retref",
                currency: "$responseObject.currency",
                transactionStatus: "$responseObject.status",
                batchId: "$responseObject.batchid",
                amount: { $toDouble: "$responseObject.amount" },
                transactionType: "$responseObject.type"
            }
        },
        {
            $match: {
                transactionDate: {
                    $gte: fromDate,
                    $lte: toDate
                },

            }
        },
        {
            $sort: {
                transactionDate: -1
            }
        },
        {
            $project: {
                responseObject: 0
            }
        },
        {
            $addFields: {
                matchedWeek: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: weeksArray,
                                as: "week",
                                cond: {
                                    $and: [
                                        { $gte: ["$transactionDate", "$$week.fromDate"] },
                                        { $lte: ["$transactionDate", "$$week.toDate"] }
                                    ]
                                }
                            }
                        },
                        0
                    ]
                }
            }
        },

        {
            $group: {
                _id: {
                    fromDate: "$matchedWeek.fromDate",
                    toDate: "$matchedWeek.toDate"
                },
                settledTransactionsCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "SALE"] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                settledAmount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "SALE"] }
                                ]
                            },
                            "$amount",
                            0
                        ]
                    }
                },
                batchIds: { $addToSet: "$batchId" }
            }
        },
        {
            $addFields: {
                batchCount: { $size: "$batchIds" }
            }
        },
        {
            $project: {
                _id: 0,
                fromDate: "$_id.fromDate",
                toDate: "$_id.toDate",
                settledTransactionsCount: 1,
                settledAmount: 1,
                batchIds: 1,
                batchCount: 1

            }
        }


    ])


    const sixWeekAggregateFinalResult = weeksArray.map(week => {
        const matchingWeek = pipeline.find(r =>
            String(r.fromDate) === String(week.fromDate) &&
            String(r.toDate) === String(week.toDate)
        );

        return matchingWeek || {
            fromDate: week.fromDate,
            toDate: week.toDate,
            "settledTransactionsCount": 0,
            "settledAmount": 0,
            "batchIds": [],
            "batchCount": 0,
        };
    });
    //-------------------------------------------
    let latestTenTransactions = await cardConnectTransactionsModel.aggregate([
        {
            $lookup: {
                from: "accounts",
                localField: "accountId",
                foreignField: "accountId",
                as: "accountRecord",
            }
        },

        {
            $lookup: {
                from: "cardconnectintegrationscredentials",
                localField: "accountId",
                foreignField: "accountId",
                as: "cardConnectDetails",
            }
        },
        { $unwind: "$accountRecord" },
        { $unwind: "$cardConnectDetails" },
        {
            $addFields: {
                transactionDate: {
                    $switch: {
                        branches: [
                            // Case: 14 digits (YYYYMMDDHHmmss)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        14
                                    ]
                                },
                                then: {
                                    $dateFromString: {
                                        dateString: {
                                            $concat: [
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 0, 4] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 4, 2] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 6, 2] }, "T",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 8, 2] }, ":",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 10, 2] }, ":",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 12, 2] }, "Z"
                                            ]
                                        }
                                    }
                                }
                            },
                            // Case: 8 digits (YYYYMMDD)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        8
                                    ]
                                },
                                then: {
                                    $dateFromString: {
                                        dateString: {
                                            $concat: [
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 0, 4] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 4, 2] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 6, 2] }, "T00:00:00Z"
                                            ]
                                        }
                                    }
                                }
                            },
                            // Case: epoch seconds (10 digits)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        10
                                    ]
                                },
                                then: {
                                    $toDate: {
                                        $multiply: [{ $toLong: { $ifNull: ["$responseObject.authdate", 0] } }, 1000]
                                    }
                                }
                            },
                            // Case: epoch millis (13 digits)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        13
                                    ]
                                },
                                then: {
                                    $toDate: { $toLong: { $ifNull: ["$responseObject.authdate", 0] } }
                                }
                            }
                        ],
                        // Default: fallback to responseObject.date
                        default: { $toDate: "$responseObject.date" }
                    }
                },
                transactionId: "$responseObject.retref",
                currency: "$responseObject.currency",
                transactionStatus: "$responseObject.status",
                batchId: "$responseObject.batchid",
                amount: { $toDouble: "$responseObject.amount" },
                transactionType: "$responseObject.type",
                merchantName: "$accountRecord.accountName",
                accountType: "$accountRecord.accountType",
                merchantId: "$cardConnectDetails.primaryKeyValues.merchantId",
                siteUrl: "$cardConnectDetails.primaryKeyValues.site",
            }
        },
        {
            $project: {
                responseObject: 0,
                accountRecord: 0,
                cardConnectDetails: 0
            }
        },
        {
            $sort: {
                transactionDate: -1
            }
        },
        {
            $limit: 10
        },



    ])

    //-------------------------------------------------------

    let latestActivityLogs = await cardConnectIntegrationsCronsModel.aggregate([
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $limit: 10
        },

        {
            $project: {
                newWOCount: 0
            }
        },
        {
            $lookup: {
                from: "accounts",
                localField: "accountId",
                foreignField: "accountId",
                as: "accountRecord",
            }
        },

        {
            $lookup: {
                from: "cardconnectintegrationscredentials",
                localField: "accountId",
                foreignField: "accountId",
                as: "cardConnectDetails",
            }
        },
        { $unwind: "$accountRecord" },
        { $unwind: "$cardConnectDetails" },

        {
            $addFields: {
                merchantName: "$accountRecord.accountName",
                accountType: "$accountRecord.accountType",
                merchantId: "$cardConnectDetails.primaryKeyValues.merchantId",
                siteUrl: "$cardConnectDetails.primaryKeyValues.site",
            }
        },
        {
            $project: {

                accountRecord: 0,
                cardConnectDetails: 0
            }
        },


    ])

    //-----------------------------------------------------------------------------------------------
    let latestBatches = await cardConnectTransactionsModel.aggregate([
        {
            $lookup: {
                from: "accounts",
                localField: "accountId",
                foreignField: "accountId",
                as: "accountRecord",
            }
        },

        {
            $lookup: {
                from: "cardconnectintegrationscredentials",
                localField: "accountId",
                foreignField: "accountId",
                as: "cardConnectDetails",
            }
        },
        { $unwind: "$accountRecord" },
        { $unwind: "$cardConnectDetails" },



        {
            $addFields: {
                batchId: "$responseObject.batchid",
                transactionStatus: "$responseObject.status",
                transactionType: "$responseObject.type",
                amount: { $toDouble: "$responseObject.amount" },
                transactionDate: {
                    $switch: {
                        branches: [
                            // Case: 14 digits (YYYYMMDDHHmmss)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        14
                                    ]
                                },
                                then: {
                                    $dateFromString: {
                                        dateString: {
                                            $concat: [
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 0, 4] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 4, 2] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 6, 2] }, "T",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 8, 2] }, ":",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 10, 2] }, ":",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 12, 2] }, "Z"
                                            ]
                                        }
                                    }
                                }
                            },
                            // Case: 8 digits (YYYYMMDD)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        8
                                    ]
                                },
                                then: {
                                    $dateFromString: {
                                        dateString: {
                                            $concat: [
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 0, 4] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 4, 2] }, "-",
                                                { $substr: [{ $toString: { $ifNull: ["$responseObject.authdate", ""] } }, 6, 2] }, "T00:00:00Z"
                                            ]
                                        }
                                    }
                                }
                            },
                            // Case: epoch seconds (10 digits)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        10
                                    ]
                                },
                                then: {
                                    $toDate: {
                                        $multiply: [{ $toLong: { $ifNull: ["$responseObject.authdate", 0] } }, 1000]
                                    }
                                }
                            },
                            // Case: epoch millis (13 digits)
                            {
                                case: {
                                    $eq: [
                                        { $strLenCP: { $toString: { $ifNull: ["$responseObject.authdate", ""] } } },
                                        13
                                    ]
                                },
                                then: {
                                    $toDate: { $toLong: { $ifNull: ["$responseObject.authdate", 0] } }
                                }
                            }
                        ],
                        // Default: fallback to responseObject.date
                        default: { $toDate: "$responseObject.date" }
                    }
                },
                transactionId: "$responseObject.retref",
                merchantName: "$accountRecord.accountName",
                accountType: "$accountRecord.accountType",
                merchantId: "$cardConnectDetails.primaryKeyValues.merchantId",
                siteUrl: "$cardConnectDetails.primaryKeyValues.site",
            },
        },
        {
            $project: {
                responseObject: 0,
                accountRecord: 0,
                cardConnectDetails: 0
            }
        },
        {
            $group: {
                _id: "$batchId",
                transactionsCount: { $sum: 1 },
                settledTransactionsCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "SALE"] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                settledAmount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "SALE"] }
                                ]
                            },
                            "$amount",
                            0
                        ]
                    }
                },
                refundedTransactionsCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "REFUND"] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                refundedAmount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "REFUND"] }
                                ]
                            },
                            { $abs: "$amount" }, // convert negative string to number, then abs
                            0
                        ]
                    }
                },
                lastTransactionCaptured: {
                    $top: {
                        sortBy: { transactionDate: -1 },
                        output: {
                            transactionId: "$transactionId",
                            transactionDate: "$transactionDate"
                        }
                    }
                },
                merchantId: { $first: "$merchantId" },
                merchantName: { $first: "$merchantName" }
            }
        },
        {
            $project: {
                _id: 0,
                batchId: "$_id",
                merchantId: 1,
                merchantName: 1,
                transactionsCount: 1,
                settledTransactionsCount: 1,
                settledAmount: 1,
                refundedTransactionsCount: 1,
                refundedAmount: 1,
                lastTransactionCaptured: 1
            }
        },
        {
            $sort: { batchId: -1 }  // latest batches first
        },
        {
            $limit: 5
        }
    ]);

    //------------------------------------------------------------------
    let summaryGrid = await cardConnectTransactionsModel.aggregate([

        {
            $addFields: {
                batchId: "$responseObject.batchid",
                transactionStatus: "$responseObject.status",
                transactionType: "$responseObject.type",
                amount: { $toDouble: "$responseObject.amount" },
                cardNumber: "$customerDetails.cardNumber",
                cardBrand: "$customerDetails.cardBrand",
                cardType: "$customerDetails.cardType",
            },
        },
        {
            $lookup: {
                from: "cardconnectexceptions",
                localField: "accountId",
                foreignField: "accountId",
                as: "exceptions",
            },
        },
        {
            $group: {
                _id: null,

                // transaction counts
                totalTransactionsCount: { $sum: 1 },

                settledTransactionsCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "SALE"] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },

                settledAmount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "SALE"] }
                                ]
                            },
                            "$amount",
                            0
                        ]
                    }
                },

                refundedTransactionsCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "REFUND"] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },

                refundedAmount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "REFUND"] }
                                ]
                            },
                            { $abs: "$amount" },
                            0
                        ]
                    }
                },

                // distinct batch count
                batchesCount: { $addToSet: "$batchId" },

                // distinct customer count based on 3 fields
                customersSet: {
                    $addToSet: {
                        cardNumber: "$cardNumber",
                        cardBrand: "$cardBrand",
                        cardType: "$cardType"
                    }
                },
                exceptions: { $first: "$exceptions" }
            }
        },
        {
            $project: {
                _id: 0,
                totalTransactionsCount: 1,
                settledTransactionsCount: 1,
                settledAmount: 1,
                refundedTransactionsCount: 1,
                refundedAmount: 1,
                batchesCount: { $size: "$batchesCount" },
                customersCount: { $size: "$customersSet" },
                totalExceptionsCount: { $size: "$exceptions" }
            }
        }
    ]);

    summaryGrid = summaryGrid[0] ? summaryGrid[0] : {
        totalTransactionsCount: 0,
        settledTransactionsCount: 0,
        settledAmount: 0,
        refundedTransactionsCount: 0,
        refundedAmount: 0,
        batchesCount: 0,
        customersCount: 0,
        totalExceptionsCount: 0
    }
    //-----------------------------------------------------


    let last24HoursStats = await cardConnectTransactionsModel.aggregate([
        {
            $match: {
                // accountId: new mongoose.Types.ObjectId(accountId),
                createdAt: {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
                    $lte: new Date(),
                },
            },
        },
        {
            $addFields: {
                batchId: "$responseObject.batchid",
                transactionStatus: "$responseObject.status",
                transactionType: "$responseObject.type",
                amount: { $toDouble: "$responseObject.amount" },
                cardNumber: "$customerDetails.cardNumber",
                cardBrand: "$customerDetails.cardBrand",
                cardType: "$customerDetails.cardType",
            },
        },

        {
            $group: {
                _id: null,

                totalTransactionsCount: { $sum: 1 },

                settledTransactionsCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "SALE"] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },

                settledAmount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "SALE"] }
                                ]
                            },
                            "$amount",
                            0
                        ]
                    }
                },

                refundedTransactionsCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "REFUND"] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },

                refundedAmount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$transactionStatus", "Processed"] },
                                    { $eq: ["$transactionType", "REFUND"] }
                                ]
                            },
                            { $abs: "$amount" },
                            0
                        ]
                    }
                },

                batchesCount: { $addToSet: "$batchId" },

                customersSet: {
                    $addToSet: {
                        cardNumber: "$cardNumber",
                        cardBrand: "$cardBrand",
                        cardType: "$cardType"
                    }
                },


            }
        },
        {
            $project: {
                _id: 0,
                totalTransactionsCount: 1,
                settledTransactionsCount: 1,
                settledAmount: 1,
                refundedTransactionsCount: 1,
                refundedAmount: 1,
                batchesCount: { $size: "$batchesCount" },
                customersCount: { $size: "$customersSet" },

            }
        }
    ]);
    let getExceptionsCountLast24Hours = await cardConnectExceptionsModel.find({
        // accountId: new mongoose.Types.ObjectId(accountId),
        createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
            $lte: new Date(),
        },

    }).countDocuments()

    // 🟢 Ensure last24HoursStats is always one object
    let responseObjLast24Hours = (last24HoursStats.length > 0 ? last24HoursStats[0] : {
        totalTransactionsCount: 0,
        settledTransactionsCount: 0,
        settledAmount: 0,
        refundedTransactionsCount: 0,
        refundedAmount: 0,
        batchesCount: 0,
        customersCount: 0
    });

    // add exceptions count to the object
    responseObjLast24Hours.totalExceptionsCount = getExceptionsCountLast24Hours;

    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_GET_MERCHANT_CARD_CONNECT_EXCEPTIONS,
            data: {
                sixWeekAggregateFinalResult,
                latestTenTransactions,
                latestActivityLogs,
                latestBatches,
                summaryGrid,
                responseObjLast24Hours

            },
        });




})




/*
* Verify the status of account.
* If status is active pass the middleware.
*/
exports.validateGetWebhookToken = asyncWrapper(async (req, res, next) => {
    const { accountId } = req.params

    const verifyAccountStatus = await accountsModel.findById({ _id: new mongoose.Types.ObjectId(accountId) })
    const reqAccountType = req.user.accountId.accountType

    if (!verifyAccountStatus || verifyAccountStatus.status !== 'active') {
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
 * Comments will be added soon as possible 
 */
exports.getWebhookToken = asyncWrapper(async (req, res) => {
    const { accountId } = req.params

    // let webhookUrl
    // if (process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "DEV") {
    //     webhookUrl = process.env.DEV_WEBHOOK_URL
    // } else if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "PROD") {
    //     webhookUrl = process.env.PROD_WEBHOOK_URL
    // }


    // let getWebhook = await webhookMasterModel.findOne({ webHookUrl: webhookUrl })

    let getWebhook = await webhookMasterModel.findOne({ accountId: accountId, status: "active" })


    return res
        .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
        .json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            data: {
                accountId: getWebhook?.accountId,
                webhookToken: getWebhook?.webhookToken
            },
        });



})