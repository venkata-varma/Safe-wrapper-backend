const mongoose = require("mongoose");

const cardConnectIntegrationMasterSchema = new mongoose.Schema(
    {
        cardConnectIntegrationsMasterId: {
            type: mongoose.Schema.Types.ObjectId,
            index: true,
            default: null,
            default: function () {
                return this._id;
            },
        },
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "AccountId is Mandatory"],
            ref: "accounts",
            index: true,
            default: null,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "UserId is Mandatory"],
            ref: "users",
            index: true,
            default: null,
        },
        source: {
            type: String,
            default: "card-connect"
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            default: ""
        },
        stepCount: {
            type: Number,
            default: 1,
        },
        status: {
            type: String,
            enum: ["active", "offline", "deleted"],
            default: "offline",
        },
        lastPullDate: {
            type: Date,
            default: null
        },
        lastIntgerationsCronId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "cardconnectintegrationscrons",
            default: null,
            index: true,
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
        // webhookSettings: {
        //   periodType: {
        //     type: String,
        //     enum: ["each second", "once each minute", "once each hour", "once each day", "once each month"],
        //     required: [true, 'periodType required'],
        //     default: ""
        //   },
        //   currentStatus: {
        //     type: String,
        //     enum: ['start', 'stop'],
        //     default: "stop"
        //   },
        //   interval: {
        //     type: Number,
        //     default: 1
        //   },
        //   expiresOn: {
        //     type: Date,
        //     default: new Date()
        //   }
        // }
    },
    { timestamps: true }
);


module.exports = mongoose.model("cardconnectintegrationmasters", cardConnectIntegrationMasterSchema);