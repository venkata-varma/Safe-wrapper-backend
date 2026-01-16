const mongoose = require('mongoose')

const squarePOSIntegrationsSettingsSchema = new mongoose.Schema({
    squarePOSIntegrationsSettingId: {
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
        interval: {
            type: Number,
            default: 1
        },
        expiresOn: {
            type: Date,
            default: new Date()
        }
    },
    cronStatus: {
        type: String,
        enum: ['start', 'stop'],
        default: "start"
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

    lastPullDate: {
        type: Date,
        default: null
    },
    lastIntgerationsCronId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "squareposintegrationscrons",
        default: null,
        index: true,
    },

    dataDumpRange: {
        type: Number,
        required: [true, 'Data dump range is required'],
        default: 20
    },
    customerObjectKeys: {
        type: Array,
        default: []
    }
}, { timestamps: true });



module.exports = mongoose.model('squarePOSintegrationssettings', squarePOSIntegrationsSettingsSchema)