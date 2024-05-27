const asyncWrapper = require("../middleware/asyncWrapper");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const fieldMappingsMasterModel = require('../models/fieldMappingsMasterModel');
const serviceProviderListModel = require('../models/serviceProviderList')
const { encryptData, decryptData } = require('../utils/encryptionAlgorithms')

const key = Buffer.from(process.env.CRYPTO_KEY, 'hex');
let iv = Buffer.from(process.env.CRYPTO_IV, 'hex')
let mongoose = require('mongoose')


/*
Function to get corrigo work orders which are already stored in MongoDB 
Work pending in function
*/
exports.get_corrigo_pro_latest_workOrders = asyncWrapper(async (req, res) => {
    const { integrationServiceProviderId } = req.params;
    const configguration_credentials = await integrationsMasterServiceProvidersModel.findById(integrationServiceProviderId).lean();
});


// let returnsEncryptedData= encryptData('b7efe625111a8610143a770f52767120',key, iv)
// console.log('returnsEncryptedData', returnsEncryptedData)    a Object 
//  let dataToBeDecrypted={
//   iv: '31ac58118bcdc9ed57f96323579ffd3e',
//   encryptedData: 'de1c371c5c33940b62f5ccb307358df4755aaae74cad2ca2772f477cb6babd598f90c9b2e7cb811e0b6d9d056f658921'
// }
//  let decryptedData=decryptData(dataToBeDecrypted, key)
//  console.log('decryptedData', decryptedData)