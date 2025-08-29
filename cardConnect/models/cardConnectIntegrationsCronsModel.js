const mongoose = require('mongoose')

const cardConnectintegrationsCronsSchema = mongoose.Schema({
    cardConnectIntegrationsCronId: {
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
    source: {
        type: String,
        default: "card-connect"
    },
    cronJobType: {
        type: String,
        enum: ["manual", "automated"],
    
    },
    pulledCount: {
        type: Number,
        default: 0
    },
    newWOCount: {
        type: Number,
        default: 0
    },
    pushedCount: {
        type: Number,
        default: 0
    },
    updatedCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["initiated", "completed", "error", "failed"],
        default: "initiated"
    }
}, { timestamps: true });


module.exports = mongoose.model('cardconnectintegrationscrons', cardConnectintegrationsCronsSchema)