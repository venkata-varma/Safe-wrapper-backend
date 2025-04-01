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
    webhookMetaPayloadId: {
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
        type: Number,
        default: 0
    },
    serialNumber: {
        type: String,
        default: ""
    },
    retrievedOn: {
        type: String,
        default: ""
    },
    transactionDateTime: {
        type: String,
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
    location:{
        type:String,
        default:""
    }
}, { timestamps: true })

webhookPayloadHeaders.pre('save', function (next) {
    this.webhookPayloadHeaderId = this._id
    next()
})

module.exports = mongoose.model('webhookpayloadheaders', webhookPayloadHeaders)