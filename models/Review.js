// models/Review.js
// Definição do esquema e modelo para Avaliações de Eventos

const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  // Referência ao evento que está sendo avaliado
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  // Referência ao usuário (trabalhador/freelancer) que fez a avaliação
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1, // Avaliação mínima de 1 estrela
    max: 5, // Avaliação máxima de 5 estrelas
  },
  comment: {
    type: String,
    trim: true,
  },
  // Indica se a avaliação foi aprovada por um administrador para ser visível
  adminApproved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Review', ReviewSchema);
