// middleware/auth.js
// Middleware para verificar e autenticar tokens JWT

const jwt = require('jsonwebtoken'); // Importa jsonwebtoken para verificar tokens
const dotenv = require('dotenv');   // Importa dotenv para carregar variáveis de ambiente

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

module.exports = function (req, res, next) {
  // Obter o token do cabeçalho da requisição
  // O token geralmente é enviado no formato "Bearer TOKEN_AQUI"
  const token = req.header('x-auth-token');

  // Verificar se nenhum token foi enviado
  if (!token) {
    return res.status(401).json({ message: 'Nenhum token fornecido, autorização negada.' });
  }

  try {
    // Verificar o token
    // jwt.verify retorna o payload se o token for válido
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Anexar o usuário decodificado ao objeto de requisição
    // Assim, as rotas que usam este middleware terão acesso ao req.user
    req.user = decoded.user;
    next(); // Chamar o próximo middleware ou a função da rota
  } catch (err) {
    // Se o token for inválido (expirado, modificado, etc.)
    res.status(401).json({ message: 'Token inválido.' });
  }
};
