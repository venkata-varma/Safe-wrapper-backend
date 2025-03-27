const mongoose = require('mongoose')

const webhookPayloadHeaders = new mongoose.Schema({
    webhookPayloadHeaderId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    webhookMasterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"webhookmasters",
        index: true
    },
    webHookMetaPayloadId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        // default:null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        // default:null
    },
    pickupGroupId: {
        type: String,
        default: ""
    },
    serialNumber: {
        type: String,
        default: ""
    },
    retrievedOn: {
        type: Date,
        default: ""
    },
    transactionDateTime: {
        type: Date,
        default: ""
    },
    userName: {
        type: String,
        default: ""
    },
    transactionType: {
        type: String,
        default: ""
    },
    amount: {
        type: String,
        default: ""
    },
    doorName: {
        type: String,
        default: ""
    },
    denominations: {
        type: String,
        default: ""
    },
    register: {
        type: String,
        default: ""
    },
    changePurchaseNumber: {
        type: String,
        default: ""
    },
    depositReferenceNumber: {
        type: String,
        default: ""
    },
}, { timestamps: true })

webhookPayloadHeaders.pre('save', function (next) {
    this.webhookPayloadHeaderId = this._id
    next()
})

module.exports = mongoose.model('webhookpayloadheaders', webhookPayloadHeaders)