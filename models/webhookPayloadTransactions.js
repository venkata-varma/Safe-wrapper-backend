const mongoose = require('mongoose')


const webhookPayloadTransactions = new mongoose.Schema({
    webhookTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        // default :null
    },
    webhookMasterId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref:"webhookmasters",
        // default:null
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
    serialNumber: {
        type: String,
        index: true,
        default: ""
    },
    transactionDeliveryType: {
        type: String,  // push API or FTP
        default: ""
    },
    transactionMode: {
        type: String, //normal or audit
        default: null
    },
    transactionType: {
        type: String, // transaction whitelist statuses
        default: ""
    },
    transactionObjProperties: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    status: {
        type: String,
        default: ""
    },

}, { timestamps: true });

webhookPayloadTransactions.pre('save', function (next) {
    this.webhookTransactionId = this._id;
    next()
})

module.exports = mongoose.model('webhookpayloadtransactions', webhookPayloadTransactions)