// backend/models/User.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Garante que cada email seja único no banco de dados
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['freelancer', 'admin'], // O papel só pode ser um desses dois valores
    default: 'freelancer', // O padrão é freelancer
  },
}, {
  timestamps: true // Adiciona os campos createdAt e updatedAt
});

module.exports = mongoose.model('User', userSchema);