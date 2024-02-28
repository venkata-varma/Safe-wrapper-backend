const { mongoose, schema } = require('mongoose')

const workOrderModelSchema = mongoose.Schema(
    {
        registrationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "registration",
            default: null
        },
        workOrders: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        MessageId: {
            type: String,
            default: ""
        },
        cronJobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "cronjobs",
            default: null
        },
        status: {
            type: String,
            enum: ["initiated", "pending", "completed", "error"],
            default: "initiated"
        },
        errorMessage: {
            type: String,
            default: null
        }
    }, { timestamps: true });

module.exports = mongoose.model('corrigoproworkorders', workOrderModelSchema)

