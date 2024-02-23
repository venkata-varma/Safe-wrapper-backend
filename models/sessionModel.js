const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema({
    accessToken:{
        type:String,
        default:""
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users',
        default:null
    },
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registration",
        default:null
    },
    expirationTime: {
        type: String,
        default:""
    },
    statusCode:{
        type:Number,
        default: 200
    }
},{timestamps:true});

module.exports = mongoose.model('sessions',sessionSchema)