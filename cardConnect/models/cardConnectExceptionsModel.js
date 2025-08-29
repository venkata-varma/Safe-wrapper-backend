const mongoose = require("mongoose");

const cardConnectExceptionsSchema = new mongoose.Schema(
    {
        cardConnectExceptionId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
            default: function () {
                return this._id;
            },
        },

        cardConnectIntegrationsMasterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "cardconnectintegrationmasters",
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
        networkCode: {
            type: Number,
            default: 200,
        },
        exceptionTitle: {
            type: String,
            default: "",
        },
        exceptionMessage: {
            type: mongoose.Schema.Types.Mixed,
            default: "",
        },
        exceptionRequestObject: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        exceptionApiService: {
            type: String,
            default: ""
        },
        dateCreated: {
            type: Date,
            default: new Date(),
        },
        cardConnectTransactionId: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);


module.exports = mongoose.model("cardconnectexceptions", cardConnectExceptionsSchema);
