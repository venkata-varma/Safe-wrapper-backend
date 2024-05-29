const asyncWrapper = require("../middleware/asyncWrapper");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterModels/integrationsMasterServiceProvidersModel");
let mongoose = require('mongoose')
const serviceProviderListModel = require('../models/integrationsMasterModels/serviceProviderList')
const { encryptData, decryptData } = require('../utils/encryptionAlgorithms')
/*
Function to get corrigo work orders which are already stored in MongoDB 
Work pending in function
*/
exports.get_corrigo_pro_latest_workOrders = asyncWrapper(async (req, res) => {
    const { integrationServiceProviderId } = req.params;
    const configguration_credentials = await integrationsMasterServiceProvidersModel.findById(integrationServiceProviderId).lean();
});



