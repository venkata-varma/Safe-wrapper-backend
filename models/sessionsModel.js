const mongoose = require('mongoose')


const sessionsSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        default:null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"accounts",
        default:null
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users',
        default:null
    },
    accessToken:{
        type:String,
        default:""
    },
    expirationTime: {
        type: String,
        default:""
    },
    expirationReason:{
        type:String,
        default:""
    },
    status:{
        type:String,
        enum:['open','closed'],
        default:"open"
    },
},{timestamps:true});

sessionsSchema.pre('save', function(next) {
    this.sessionId = this._id;
    next();
});

module.exports = mongoose.model('sessions',sessionsSchema)