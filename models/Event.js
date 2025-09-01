// models/Event.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  title: {
    type: String,
    required: true,
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
  },
  location: {
    type: String,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  // Referência ao admin que criou o evento
  admin: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Faz referência ao modelo 'User'
    required: true,
  },
  // Lista de freelancers que trabalharão no evento
  workers: [{
    type: Schema.Types.ObjectId,
    ref: 'User', // Faz referência ao modelo 'User'
  }],
}, {
  timestamps: true // Adiciona os campos createdAt e updatedAt automaticamente
});

module.exports = mongoose.model('Event', eventSchema);