const mongoose = require('mongoose')

const cardConnectIntegrationsSettingsSchema = new mongoose.Schema({
    cardConnectIntegrationsSettingId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
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


    periodSettings: {
        periodType: {
            type: String,
            enum: ["once each minute", "once each hour", "once each day", "once each month"],
            required: [true, 'periodType required'],
            default: ""
        },
        currentStatus: {
            type: String,
            enum: ['start', 'stop'],
            default: "start"
        },
        interval: {
            type: Number,
            default: 1
        },
        expiresOn: {
            type: Date,
            default: new Date()
        }
    },

    requiredDatapoints: {
        type: Object,
        default: {}
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
    transactionStatusKeys: {
        type: Array,
        default: []
    },
    transactionTypeKeys: {
        type: Array,
        default: []
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
    // dataPointsAccess: {
    //     type: Object,
    //     default: {}
    // },
    dataDumpRange: {
        type: Number,
        required: [true, 'data dump range is required'],
        default: 20
    },
    customerObjectKeys: {
        type: Array,
        default: []
    }
}, { timestamps: true });



module.exports = mongoose.model('cardconnectintegrationssettings', cardConnectIntegrationsSettingsSchema)