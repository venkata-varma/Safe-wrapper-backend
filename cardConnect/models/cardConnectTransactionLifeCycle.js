const mongoose = require('mongoose')

const cardConnectTransactionLifeCycleSchema = new mongoose.Schema({
    transactionLifeCycleId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        default: null,
        default: function () {
            return this._id;
        }
    },
    transactionId: {
        type: String,
        default: ""
    },

    transactionStatus: {
        type: String,
        default: ""
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
    requestObject: {
        type: String,
        default: ""
    },
    responseObject: {
        type: String,
        default: ""
    },
    customerDetails: {
        type: Object,
        default: {}
    },
    source: {
        type: String,
        default: "card-connect"
    },
    date_created: {
        type: Date,
        default: new Date()
    },
    notes: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['active', 'draft', 'deactivate', 'deleted'],
        default: "active"
    }
},
    { timestamps: true }
);


module.exports = mongoose.model('cardconnecttransactionlifecycle', cardConnectTransactionLifeCycleSchema);