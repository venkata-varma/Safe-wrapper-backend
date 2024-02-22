const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema({
    accessToken:{
        type:String
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'users',
    },
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registration"
    },
    expirationTime: {
        type: String,
    },
    statusCode:{
        type:Number,
        default: 200
    }
},{timestamps:true});

module.exports = mongoose.model('sessions',sessionSchema)