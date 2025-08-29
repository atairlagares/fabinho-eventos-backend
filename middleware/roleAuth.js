// middleware/roleAuth.js
// Middleware para verificar o papel do usuário autenticado

module.exports = function(roles) {
  return (req, res, next) => {
    // req.user é definido pelo middleware 'auth' e contém { id, role }
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Acesso negado. Não autenticado ou papel de usuário ausente.' });
    }

    // Verifica se o papel do usuário está incluído nos papéis permitidos
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para realizar esta ação.' });
    }

    next(); // Se o papel for permitido, continua para a próxima função
  };
};
