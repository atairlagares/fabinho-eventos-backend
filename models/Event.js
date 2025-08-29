// models/Event.js
// Definição do esquema e modelo para Eventos

const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  // Referência ao usuário que criou o evento (administrador)
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Lista de IDs de usuários (freelancers) que trabalharão no evento
  workers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isPublished: {
    type: Boolean,
    default: false, // Eventos podem ser criados e depois publicados por um admin
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Event', EventSchema);
