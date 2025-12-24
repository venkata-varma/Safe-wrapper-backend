const mongoose = require("mongoose");

const squarePOSLocationsSchema = new mongoose.Schema(
    {
        squarePOSLocationId: {
            type: mongoose.Schema.Types.ObjectId,
            index: true,
            default: function () {
                return this._id;
            },
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
        referenceId: {
            type: String, // Square Location ID (L...)
            default: "",
            index: true
        },
        referenceStatus: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", ""],
            default: "",
        },
        responseObject: {
            type: Object, // Raw data from Square /v2/locations
            default: {}
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
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
    "squarePOSLocations",
    squarePOSLocationsSchema
);