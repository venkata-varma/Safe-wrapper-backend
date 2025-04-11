const mongoose = require('mongoose')

const webhookMetaPayloads = new mongoose.Schema({
    webhookMetaPayloadId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        // default:null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "accounts",
        index: true,
        // default: null,
    },
    webhookMasterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "webhookmasters",
        index: true,
        // default:null
    },
    lastPullDate: {
        type: Date,
        default: null
    },
    dataPoint: {
        type: mongoose.Schema.Types.Mixed,
        dataType: String,
        default: {}
    },
    status: {
        type: String,
        enum: ['received', 'in-progress', 'executed', 'execution-failed', 'deleted'],
        default: "received"
    },
    primaryHookId: {
        type: String,
        // unique:true,
        default: ""
    }
}, { timestamps: true })

webhookMetaPayloads.pre('save', function (next) {
    this.webhookMetaPayloadId = this._id
    next()
})
module.exports = mongoose.model('webhookmetapayloads', webhookMetaPayloads)