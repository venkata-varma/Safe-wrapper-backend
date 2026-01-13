const mongoose = require('mongoose')

const squarePOSintegrationsCronsSchema = mongoose.Schema({
    squarePOSIntegrationsCronId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
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
    source: {
        type: String,
        default: "square-pos"
    },
    cronJobType: {
        type: String,
        enum: ["manual", "automated"],

    },
    pulledCount: {
        type: Number,
        default: 0
    },
    exceptionIds: {
        type: Array,
        default: []
    },

    pushedCount: {
        type: Number,
        default: 0
    },
    updatedCount: {
        type: Number,
        default: 0
    },
    dateRange: {
        type: Array,
        default: ""
    },
    status: {
        type: String,
        enum: ["initiated", "completed", "error", "failed", "completed_with_errors"],
        default: "initiated"
    }
}, { timestamps: true });


module.exports = mongoose.model('squareposintegrationscrons', squarePOSintegrationsCronsSchema)