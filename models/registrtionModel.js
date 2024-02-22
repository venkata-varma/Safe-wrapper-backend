const mongoose = require('mongoose')


const registrationSchema = new mongoose.Schema({
    fullName:{
        type:String,
        require:[true, 'name is required.']
    },
    companyName:{
        type:String,
        require:[true, 'comapany name is required.']
    },
    mobileNumber:{
        type:String,
        require:[true, 'mobile number is required.']
    },
    email:{
        type:String,
        require:[true, 'email is required.']
    },
    password:{
        type:String,
        require:[true, 'password is required.']
    },
    registrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "registration"
    },
    status:{
        type:String,
        enum:['active','deleted'],
        default:"active"
    }
},{timestamps:true});

registrationSchema.pre('save', function(next) {
    this.registrationId = this._id;
    next();
});

module.exports = mongoose.model('registration',registrationSchema)