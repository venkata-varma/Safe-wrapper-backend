const { mongoose, schema } = require('mongoose')

const CPDWorkordersModelSchema = mongoose.Schema(
    {
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "accounts",
            default: null,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            default: null,
        },
        workOrders: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        MessageId: {
            type: String,
            default: ""
        },
        errorMessage: {
            type: String,
            default: null
        }
    }, { timestamps: true });

module.exports = mongoose.model('cpdworkorders', CPDWorkordersModelSchema)

