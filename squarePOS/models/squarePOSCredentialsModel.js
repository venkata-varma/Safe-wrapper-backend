const mongoose = require("mongoose");

const squarePOSIntegrationsCredentialsSchema = new mongoose.Schema(
    {
        squarePOSIntegrationsCredentialsId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
            default: function () {
                return this._id;
            },
        },

        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Account id is mandatory."],
            ref: "accounts",
            unique: [true, "Account Id must be unique"],
            index: true,
            default: null,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "User id is mandatory."],
            ref: "users",
            index: true,
            default: null,
        },
        credentials: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        primaryKeyValues: {
            type: Object,
            default: {}
        },
        status: {
            type: String,
            enum: ["new", "verified", "active", "failed", "deleted"],
            default: "new",
        },
        source: {
            type: String,
            required: [true, "Source is mandatory."],
            default: "square-pos"
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
    "squareposcredentialsmodel",
    squarePOSIntegrationsCredentialsSchema
);

