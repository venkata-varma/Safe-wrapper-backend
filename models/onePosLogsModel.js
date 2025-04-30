const mongoose = require('mongoose');

const onePosLogsSchema = mongoose.Schema({
    onePosLogId: {
        type: mongoose.Schema.Types.ObjectId,
        default: function() {
            return this._id;
        }
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },    
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    apiCalled: {
        type: String,
        required: true,
        trim: true
    },
    serialNumbers: {
        type: [String],
        default: []
    },
    transactionTypes: {
        type: [String],
        default: []
    },
    transactionDateAndTimes:{
        type:Array,
        default:[]
    },
    authenticationDateAndTime: {
        type: Date,
        default: Date.now
    },
    authenticationCount: {
        type: Number,
        default: 0,
    }
},
{timestamps: true});

module.exports = mongoose.model('Oneposlogs', onePosLogsSchema);