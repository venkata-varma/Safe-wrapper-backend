const mongoose = require("mongoose");

const squarePOSPaymentsSchema = new mongoose.Schema(
    {
        squarePOSPaymentId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
            default: function () {
                return this._id;
            },
        },
        squarePOSIntegrationsCronIdCreate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "squareposintegrationscrons",
            default: null,
            index: true,

        },
        squarePOSIntegrationsCronIdUpdate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "squareposintegrationscrons",
            default: null,
            index: true,

        },
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "accounts",
            index: true,
            default: null,
        },
        // merchantName: {
        //     type: String,
        //     default: ""
        // },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            index: true,
            default: null,
        },
        referenceId: {
            type: String,
            default: ""
        },
        responseObject: {
            type: Object,
            default: {}
        },
        customerDetails: {
            type: Object,
            default: {}
        },
        referenceStatus: {
            type: String,
            enum: [
                "COMPLETED",
                "APPROVED",
                "CANCELED",
                "FAILED",
                "PENDING"
            ],
            default: "",
        },
        sourceType: {
            type: String,
            enum: ["CARD", "CASH"]
        },
        // referenceType: {
        //     type: String,
        //     enum: ["", "SALE", "VOID SALE", "VOID REFUND", "UNKNOWN", "REFUND", "CASH ADVANCE", "AUTH REQUEST", "ACCOUNT VERIFY"],
        //     default: ""
        // },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            // required: [true, "Created by is required."],
            default: null,
        },


    },
    { timestamps: true }
);



module.exports = mongoose.model(
    "squarePOSPayments",
    squarePOSPaymentsSchema
);
