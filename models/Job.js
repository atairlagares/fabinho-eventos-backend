// models/Job.js
// Definição do esquema e modelo para Vagas de Freelancers

const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  requirements: {
    type: String,
    required: true,
  },
  // Referência ao evento ao qual esta vaga pertence (opcional)
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    // Não é required, pois pode haver vagas que não estão ligadas a um evento específico de imediato
    // mas são para talentos gerais ou futuros projetos
  },
  // Referência ao usuário que criou a vaga (administrador)
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Lista de usuários (freelancers) que se candidataram a esta vaga
  applicants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  status: {
    type: String,
    enum: ['open', 'closed', 'filled'], // Status da vaga
    default: 'open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Job', JobSchema);
