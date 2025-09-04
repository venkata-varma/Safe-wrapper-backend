const mongoose = require("mongoose");

const cardConnectTransactionsSchema = new mongoose.Schema(
    {
        cardConnectTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
            default: function () {
                return this._id;
            },
        },
        cardConnectIntegrationsCronIdCreate: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"cardconnectintegrationscrons",
            default: null,
            index: true,
            
        },
        cardConnectIntegrationsCronIdUpdate: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"cardconnectintegrationscrons",
            default: null,
            index: true,
            
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
            type: String,
            default: ""
        },
        responseObject: {
            type: Object,
            default: {}
        },
        referenceStatus: {
            type: String,
            enum: ["Auth", "Captured", "Voided", "Failure", "Rejected", "Declined", "Settled", "Processed", "Unknown", ""],
            default: "",
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
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            default: null,
        },

    },
    { timestamps: true }
);



module.exports = mongoose.model(
    "cardconnecttransactions",
    cardConnectTransactionsSchema
);
