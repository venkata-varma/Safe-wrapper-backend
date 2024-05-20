// const axios = require('axios');
const integrationsModel = require("../models/integrationsMasterModel");
const serviceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsFieldMappingModel = require("../models/integrationsFieldMappingModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const authentication = require("../utils/authentication");
const asyncWrapper = require("../middleware/asyncWrapper");
const customConstants = require("../config/constants.json");
const sessionsModel = require("../models/sessionsModel");
const integrationsMasterModel = require("../models/integrationsMasterModel");

exports.createIntegrations = asyncWrapper(async (req, res) => {
  try {
    const integrationsDetails = await integrationsModel.create(req.body);

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATIONS,
        data: { integrationsDetails },
      });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: customConstants.statusCodes.INTERNAL_SERVER_ERROR,
      message: customConstants.messages.MESSAGE_INTERNAL_SERVER_ERROR,
      error: error.message,
    });
  }
});

exports.addServiceProviderCredentials = asyncWrapper(async (req, res) => {
  try {
    const { userId, accountId, serviceProvider, integrationsMasterId } =
      req.body;

    // Create a new service provider
    const serviceProviderDetails = await serviceProvidersModel.create(req.body);

    // Find the past integration details
    const pastIntegrationDetails = await integrationsModel.findOne({
      integrationsMasterId: req.body.integrationsMasterId,
    });
    console.log(pastIntegrationDetails, "pastIntegrationDetails");

    // Determine the update fields
    const updateFields = {
      stepCount: pastIntegrationDetails.stepCount + 1,
      updatedBy: userId,
    };

    if (pastIntegrationDetails.stepCount === 0) {
      updateFields.from = serviceProvider;
    } else {
      updateFields.to = serviceProvider;
    }

    // Perform the update
    const updatedIntegrationsDetails = await integrationsModel.findOneAndUpdate(
      { integrationsMasterId },
      { ...req.body, ...updateFields },
      { new: true } // Options to return the updated document
    );

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATIONS,
        data: { updatedIntegrationsDetails },
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

exports.updateIntegrationsFieldMappings = asyncWrapper(async (req, res) => {
  console.log(req.body, "checkkkk");
  try {
    const { integrationsMasterId, userId } = req.body;
    const pastIntegrationDetails = await integrationsModel.findOne({
      integrationsMasterId,
    });

    let updatedIntegrationsDetails;
    if (!pastIntegrationDetails) {
      return res.status(404).json({
        status: customConstants.statusCodes.NOT_FOUND,
        message: "Integration details not found.",
      });
    }

    // Create or update the integrationsFieldMapping
    let integrationsFieldMapping;
    const existingFieldMapping = await integrationsFieldMappingModel.findOne({
      integrationsMasterId,
    });

    if (existingFieldMapping) {
      integrationsFieldMapping =
        await integrationsFieldMappingModel.findOneAndUpdate(
          { integrationsMasterId },
          req.body,
          { new: true }
        );
    } else {
      integrationsFieldMapping = await integrationsFieldMappingModel.create({
        ...req.body,
      });
      // Perform the update
      updatedIntegrationsDetails = await integrationsModel.findOneAndUpdate(
        { integrationsMasterId },
        {
          stepCount: pastIntegrationDetails.stepCount + 1,
          updatedBy: userId,
        },
        { new: true } // Options to return the updated document
      );
    }

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATIONS,
        data: { updatedIntegrationsDetails },
      });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: customConstants.statusCodes.INTERNAL_SERVER_ERROR,
      message: customConstants.messages.MESSAGE_INTERNAL_SERVER_ERROR,
      error: error.message,
    });
  }
});

exports.updateIntegrationsSettings = asyncWrapper(async (req, res) => {
  console.log(req.body, "checkkkk");
  try {
    const { integrationsMasterId, userId } = req.body;
    const pastIntegrationDetails = await integrationsModel.findOne({
      integrationsMasterId,
    });

    let updatedIntegrationsDetails;
    if (!pastIntegrationDetails) {
      return res.status(404).json({
        status: customConstants.statusCodes.NOT_FOUND,
        message: "Integration details not found.",
      });
    }

    let integrationsSettings;
    const existingintegrationsSettings =
      await integrationsSettingsModel.findOne({
        integrationsMasterId,
      });

    if (existingintegrationsSettings) {
      integrationsSettings = await integrationsSettingsModel.findOneAndUpdate(
        { integrationsMasterId },
        req.body,
        { new: true }
      );
    } else {
      integrationsSettings = await integrationsSettingsModel.create({
        ...req.body,
      });
      // Perform the update
      updatedIntegrationsDetails = await integrationsModel.findOneAndUpdate(
        { integrationsMasterId },
        {
          stepCount: pastIntegrationDetails.stepCount + 1,
          updatedBy: userId,
        },
        { new: true } // Options to return the updated document
      );
    }

    return res
      .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
      .json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATIONS,
        data: { updatedIntegrationsDetails },
      });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: customConstants.statusCodes.INTERNAL_SERVER_ERROR,
      message: customConstants.messages.MESSAGE_INTERNAL_SERVER_ERROR,
      error: error.message,
    });
  }
});

exports.getSingleIntegration = asyncWrapper(async (req, res) => {
  const { integrationMasterId } = req.params;
  const integrationDetails = await integrationsMasterModel
    .findById(integrationMasterId)
    .lean();

  console.log(integrationMasterId, "integrationMasterId");

  const settingsDetails = await integrationsSettingsModel
    .findOne({ integrationsMasterId: integrationMasterId })
    .lean();
  return res
    .status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS)
    .json({
      status: customConstants.messages.MESSAGE_SUCCESS,
      message: customConstants.messages.MESSAGE_GET_INTEGRATIONS,
      data: {
        // totalCorrigoProWorkOrders: CPDWorkOrders.length, totalServiceProvidersWorkOrders: serviceProvidersWorkOrderslength,
        // totalCorrigoProInvoices: CPDInvoices.length, totalServiceProvidersInvoices: serviceprovidersInvoiceslength,
        // totalQuickBooksInvoices: QBInvoices.length,
        // cronjobsCount: cronjobDetails.length,
        integrationDetails,
        // configDetails,
        // cronjobDetails,
        integrationsSettingsDetails: settingsDetails,
        // corrigoWorkOrders: CPDWorkOrders,
        // ServiceProvidersWorkOrders: ServiceProvidersWorkOrders,
        // corrigoProInvoices: CPDInvoices,
        // serviceprovidersInvoices: ServiceProvidersInvoices
      },
    });
});
