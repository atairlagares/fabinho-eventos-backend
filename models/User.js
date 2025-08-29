// models/User.js
// Definição do esquema e modelo para usuários

const mongoose = require('mongoose');

// Define o esquema do usuário
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Garante que cada e-mail seja único
    lowercase: true, // Armazena e-mails em minúsculas
    trim: true, // Remove espaços em branco do início e fim
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // 'freelancer' ou 'admin'
  role: {
    type: String,
    enum: ['freelancer', 'admin'], // Garante que o role seja um desses valores
    default: 'freelancer',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Cria e exporta o modelo User a partir do esquema
module.exports = mongoose.model('User', UserSchema);
