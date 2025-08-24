const mongoose = require('mongoose')

const cardConnectIntegrationsSettingsSchema = new mongoose.Schema({
    cardConnectIntegrationsSettingId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
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
    periodType: {
        type: String,
        enum: ["each second", "once each minute", "once each hour", "once each day", "once each month"],
        required: [true, 'periodType required'],
        default: ""
    },
    currentStatus: {
        type: String,
        enum: ['start', 'stop'],
        default: "stop"
    },
    periodSettings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    statusPreValidationConditions: {
        type: Object,
        default: {}
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
    statusFieldMappingKeys: {
        type: Object,
        default: {}
    },
    dataPointsAccess: {
        type: Object,
        default: {}
    },
    dataDumpRange: {
        type: Number,
        required: [true, 'data dump range is required'],
        default: 20
    },
    expiresOn: {
        type: Date,
        default: new Date()
    }
}, { timestamps: true });



module.exports = mongoose.model('cardconnectintegrationssettings', cardConnectIntegrationsSettingsSchema)