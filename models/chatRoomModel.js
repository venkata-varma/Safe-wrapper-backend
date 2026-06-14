const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({

    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'accounts',
            required: true
        }
    ],

    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'messages',
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('chats', chatSchema);