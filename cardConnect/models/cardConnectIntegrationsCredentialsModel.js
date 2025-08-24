const mongoose = require("mongoose");

const cardConnectIntegrationsCredentialsSchema = new mongoose.Schema(
    {
        cardConnectIntegrationsCredentialsId: {
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
        credentials: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        serviceProvider: {
            type: String,
            default: "cardConnect"
            // enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF","CYS"],
            //   require: [true, "Role is required."],
            // default: "",
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
    "cardconnectintegrationscredentials",
    cardConnectIntegrationsCredentialsSchema
);
