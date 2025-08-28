const mongoose = require("mongoose");

const cardConnectIntegrationsAPIUrlFlowSchema = new mongoose.Schema(
    {
        cardConnectIntegrationsAPIUrlFlowId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
            default: function () {
                return this._id;
            },
        },
        cardConnectIntegrationsMasterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "cardconnectIntegrationmasters",
            index: true,
            default: null,
        },
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "accounts",
            index: true,
            default: null,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            index: true,
            default: null,
        },
        APIUrlFlows: {
            type: Array,
            default: []
        },

        status: {
            type: String,
            enum: ["new", "verified", "active", "failed", "deleted"],
            default: "new",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: [true, "Created by is required."],
            default: null,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            default: null,
        },

    },
    { timestamps: true }
);



module.exports = mongoose.model(
    "cardconnectintegrationsapiurlflows",
    cardConnectIntegrationsAPIUrlFlowSchema
);
