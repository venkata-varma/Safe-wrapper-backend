const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({

    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'chats',
        required: true
    },

    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'accounts',
        required: true
    },

    message: {
        type: String,
        required: true,
        trim: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('messages', messageSchema);