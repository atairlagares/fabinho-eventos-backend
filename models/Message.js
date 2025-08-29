// models/Message.js
// Definição do esquema e modelo para Mensagens Internas

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  // Remetente da mensagem
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Destinatário da mensagem
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  read: {
    type: Boolean,
    default: false, // Indica se a mensagem foi lida
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Message', MessageSchema);
