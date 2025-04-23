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
        default:null
    },
    webhookMetaPayloadId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        default:null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        ref:"accounts",
        default:null
    },
    pickupGroupId: {
        type:Number,
        default:0
    },
    serialNumber: {
        type:String,
        index:true,
        default:""
    },
    retrievedOn: {
        type: String,
        default:""
    },
    transactionDateTime: {
        type: String,
        index:true,
        default:""
    },
    userName:  {
        type: String,
        default:""
    },
    transactionType:  {
        type: String,
        index:true,
        default:""
    },
    amount:  {
        type: Number,
        default:0
    },
    denominations:{
        type: Array,
        default:[]
    },
    location:{
        type: String,
        default:""
    },
    status: {
        type: String,
        default: "active "
    },

}, { timestamps: true });

webhookPayloadTransactions.pre('save', function (next) {
    this.webhookTransactionId = this._id;
    next()
})

module.exports = mongoose.model('webhookpayloadtransactions', webhookPayloadTransactions)