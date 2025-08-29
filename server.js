// server.js
// Configuração inicial do servidor Node.js com Express.js e conexão MongoDB
// Incluindo rotas de registro, login de usuário, middleware de autenticação e autorização
// e rotas para Eventos, Vagas, Avaliações e Mensagens
// Agora com configuração CORS

const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Importa o pacote CORS
const app = express();

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Middleware para analisar o corpo das requisições JSON
app.use(express.json());

// =========================================================================================
// Configuração do CORS
// =========================================================================================
// Para desenvolvimento: Permite todas as origens.
// Em produção, é RECOMENDADO restringir para o(s) domínio(s) do seu frontend.
// Exemplo para produção (substitua com o domínio real do seu frontend quando fizer o deploy):
/*
const allowedOrigins = ['https://seudominiofrontend.com', 'exp://*.expo.dev']; // Adicione as origens permitidas
app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origem (como de aplicativos móveis ou ferramentas como Postman/Insomnia)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'A política CORS para este site não permite acesso da origem especificada.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
*/
app.use(cors()); // Usando CORS com configuração padrão para permitir todas as origens por enquanto

// Importa os modelos
const User = require('./models/User');
const Event = require('./models/Event');
const Job = require('./models/Job');
const Review = require('./models/Review');
const Message = require('./models/Message');

// Importa os middlewares
const auth = require('./middleware/auth');
const roleAuth = require('./middleware/roleAuth'); // Importa o middleware de autorização por papel

// --------------------------------------------------------------------------
// Conexão com o MongoDB
// --------------------------------------------------------------------------
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('Erro: MONGO_URI não definida no arquivo .env!');
}

mongoose.connect(mongoUri)
  .then(() => console.log('Conexão com MongoDB estabelecida com sucesso!'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// --------------------------------------------------------------------------
// Rotas da API
// --------------------------------------------------------------------------

// Rota de teste simples
app.get('/', (req, res) => {
  res.send('Servidor Node.js do Backend está funcionando!');
});

// --- Rotas de Autenticação ---

// Rota de Registro de Usuário
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Por favor, preencha todos os campos obrigatórios: nome, email e senha.' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Este e-mail já está em uso.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: role && ['freelancer', 'admin'].includes(role) ? role : undefined,
    });

    await user.save();

    res.status(201).json({ message: 'Usuário registrado com sucesso!', userId: user._id, email: user.email, role: user.role });

  } catch (error) {
    console.error('Erro no registro do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao registrar o usuário.' });
  }
});

// Rota de Login de Usuário
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Por favor, forneça e-mail e senha.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Credenciais inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciais inválidas.' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, userId: user.id, role: user.role });
      }
    );

  } catch (error) {
    console.error('Erro no login do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
  }
});

// Rota de exemplo protegida
app.get('/api/protected', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ message: `Bem-vindo à rota protegida, ${user.name}! Seu papel é ${user.role}.`, user });
  } catch (error) {
    console.error('Erro ao acessar rota protegida:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao acessar recurso protegido.' });
  }
});

// --- Rotas para Eventos ---

// Criar um Evento (somente Admin)
app.post('/api/events', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { title, description, startDate, endDate, location, isPublished, workers } = req.body;
    const adminId = req.user.id; // ID do admin que está criando o evento

    const newEvent = new Event({
      title,
      description,
      startDate,
      endDate,
      location,
      admin: adminId,
      isPublished: isPublished || false,
      workers: workers || [],
    });

    await newEvent.save();
    res.status(201).json({ message: 'Evento criado com sucesso!', event: newEvent });
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao criar evento.' });
  }
});

// Obter todos os eventos (visível para todos autenticados)
app.get('/api/events', auth, async (req, res) => {
  try {
    const events = await Event.find().populate('admin', 'name email').populate('workers', 'name email');
    res.status(200).json(events);
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar eventos.' });
  }
});

// Obter um único evento por ID
app.get('/api/events/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('admin', 'name email').populate('workers', 'name email');
    if (!event) {
      return res.status(404).json({ message: 'Evento não encontrado.' });
    }
    res.status(200).json(event);
  } catch (error) {
    console.error('Erro ao buscar evento por ID:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar evento.' });
  }
});

// Atualizar um evento (somente admin)
app.put('/api/events/:id', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { title, description, startDate, endDate, location, isPublished, workers } = req.body;
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { title, description, startDate, endDate, location, isPublished, workers },
      { new: true } // Retorna o documento atualizado
    );
    if (!updatedEvent) {
      return res.status(404).json({ message: 'Evento não encontrado.' });
    }
    res.status(200).json({ message: 'Evento atualizado com sucesso!', event: updatedEvent });
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atualizar evento.' });
  }
});

// Deletar um evento (somente admin)
app.delete('/api/events/:id', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) {
      return res.status(404).json({ message: 'Evento não encontrado.' });
    }
    res.status(200).json({ message: 'Evento deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar evento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao deletar evento.' });
  }
});

// Adicionar um trabalhador a um evento (somente admin)
app.put('/api/events/:id/add-worker', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { workerId } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Evento não encontrado.' });
    }
    if (!event.workers.includes(workerId)) {
      event.workers.push(workerId);
      await event.save();
    }
    res.status(200).json({ message: 'Trabalhador adicionado ao evento com sucesso!', event });
  } catch (error) {
    console.error('Erro ao adicionar trabalhador:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao adicionar trabalhador.' });
  }
});

// Remover um trabalhador de um evento (somente admin)
app.put('/api/events/:id/remove-worker', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { workerId } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Evento não encontrado.' });
    }
    event.workers = event.workers.filter(worker => worker.toString() !== workerId);
    await event.save();
    res.status(200).json({ message: 'Trabalhador removido do evento com sucesso!', event });
  } catch (error) {
    console.error('Erro ao remover trabalhador:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao remover trabalhador.' });
  }
});

// Publicar um evento (somente admin)
app.put('/api/events/:id/publish', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { isPublished: true },
      { new: true }
    );
    if (!event) {
      return res.status(404).json({ message: 'Evento não encontrado.' });
    }
    res.status(200).json({ message: 'Evento publicado com sucesso!', event });
  } catch (error) {
    console.error('Erro ao publicar evento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao publicar evento.' });
  }
});


// --- Rotas para Vagas de Freelancers ---

// Criar uma Vaga (somente Admin)
app.post('/api/jobs', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { title, description, requirements, eventId } = req.body;
    const adminId = req.user.id;

    const newJob = new Job({
      title,
      description,
      requirements,
      event: eventId || null, // Se um eventId for fornecido, associa a vaga ao evento
      admin: adminId,
    });

    await newJob.save();
    res.status(201).json({ message: 'Vaga criada com sucesso!', job: newJob });
  } catch (error) {
    console.error('Erro ao criar vaga:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao criar vaga.' });
  }
});

// Obter todas as vagas (visível para todos autenticados)
app.get('/api/jobs', auth, async (req, res) => {
  try {
    const jobs = await Job.find().populate('admin', 'name email').populate('event', 'title startDate').populate('applicants', 'name email');
    res.status(200).json(jobs);
  } catch (error) {
    console.error('Erro ao buscar vagas:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar vagas.' });
  }
});

// Obter uma única vaga por ID
app.get('/api/jobs/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('admin', 'name email').populate('event', 'title startDate').populate('applicants', 'name email');
    if (!job) {
      return res.status(404).json({ message: 'Vaga não encontrada.' });
    }
    res.status(200).json(job);
  } catch (error) {
    console.error('Erro ao buscar vaga por ID:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar vaga.' });
  }
});

// Atualizar uma vaga (somente admin)
app.put('/api/jobs/:id', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { title, description, requirements, eventId, status } = req.body;
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      { title, description, requirements, event: eventId, status },
      { new: true }
    );
    if (!updatedJob) {
      return res.status(404).json({ message: 'Vaga não encontrada.' });
    }
    res.status(200).json({ message: 'Vaga atualizada com sucesso!', job: updatedJob });
  } catch (error) {
    console.error('Erro ao atualizar vaga:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atualizar vaga.' });
  }
});

// Deletar uma vaga (somente admin)
app.delete('/api/jobs/:id', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const deletedJob = await Job.findByIdAndDelete(req.params.id);
    if (!deletedJob) {
      return res.status(404).json({ message: 'Vaga não encontrada.' });
    }
    res.status(200).json({ message: 'Vaga deletada com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar vaga:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao deletar vaga.' });
  }
});

// Aplicar para uma vaga (somente freelancer)
app.post('/api/jobs/:id/apply', auth, roleAuth(['freelancer']), async (req, res) => {
  try {
    const jobId = req.params.id;
    const freelancerId = req.user.id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Vaga não encontrada.' });
    }

    // Verifica se o freelancer já se candidatou
    if (job.applicants.includes(freelancerId)) {
      return res.status(400).json({ message: 'Você já se candidatou a esta vaga.' });
    }

    job.applicants.push(freelancerId);
    await job.save();

    res.status(200).json({ message: 'Candidatura enviada com sucesso!', job });
  } catch (error) {
    console.error('Erro ao candidatar-se à vaga:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao candidatar-se à vaga.' });
  }
});


// --- Rotas para Avaliações ---

// Enviar uma Avaliação para um Evento (somente Trabalhador do Evento)
app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;
    const reviewerId = req.user.id; // O ID do usuário que está fazendo a avaliação

    // Verifica se o usuário autenticado é um "worker" do evento antes de permitir a avaliação
    const event = await Event.findById(eventId);
    if (!event || !event.workers.includes(reviewerId)) {
      return res.status(403).json({ message: 'Você não tem permissão para avaliar este evento ou o evento não existe.' });
    }

    const newReview = new Review({
      event: eventId,
      reviewer: reviewerId,
      rating,
      comment,
    });

    await newReview.save();
    res.status(201).json({ message: 'Avaliação enviada com sucesso!', review: newReview });
  } catch (error) {
    console.error('Erro ao enviar avaliação:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao enviar avaliação.' });
  }
});

// Obter avaliações para um evento específico (Autenticado)
app.get('/api/reviews/event/:eventId', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ event: req.params.eventId })
      .populate('reviewer', 'name email')
      .populate('event', 'title');
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Erro ao buscar avaliações do evento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar avaliações do evento.' });
  }
});

// Obter avaliações feitas por um usuário específico (Próprio Usuário ou Admin)
app.get('/api/reviews/user/:userId', auth, async (req, res) => {
  try {
    // Permite que o próprio usuário veja suas avaliações ou um admin veja as de qualquer um
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para ver estas avaliações.' });
    }

    const reviews = await Review.find({ reviewer: req.params.userId })
      .populate('reviewer', 'name email')
      .populate('event', 'title');
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Erro ao buscar avaliações do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar avaliações do usuário.' });
  }
});

// Aprovar uma avaliação (somente admin)
app.put('/api/reviews/:id/approve', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { adminApproved: true },
      { new: true }
    );
    if (!review) {
      return res.status(404).json({ message: 'Avaliação não encontrada.' });
    }
    res.status(200).json({ message: 'Avaliação aprovada com sucesso!', review });
  } catch (error) {
    console.error('Erro ao aprovar avaliação:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao aprovar avaliação.' });
  }
});


// --- Rotas para Mensagens Internas ---

// Enviar uma Mensagem (Autenticado)
app.post('/api/messages', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
    });

    await newMessage.save();
    res.status(201).json({ message: 'Mensagem enviada com sucesso!', message: newMessage });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao enviar mensagem.' });
  }
});

// Obter todas as mensagens enviadas ou recebidas por um usuário específico (Próprio Usuário ou Admin)
app.get('/api/messages/user/:userId', auth, async (req, res) => {
  try {
    // O usuário só pode ver suas próprias mensagens, a menos que seja um admin
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para ver estas mensagens.' });
    }

    const messages = await Message.find({
      $or: [{ sender: req.params.userId }, { receiver: req.params.userId }]
    })
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .sort({ createdAt: 1 }); // Ordena por data de criação

    res.status(200).json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar mensagens do usuário.' });
  }
});

// Marcar mensagem como lida (somente Destinatário da Mensagem ou Admin)
app.put('/api/messages/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Mensagem não encontrada.' });
    }

    // Apenas o receptor ou um admin pode marcar a mensagem como lida
    if (message.receiver.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para marcar esta mensagem como lida.' });
    }

    message.read = true;
    await message.save();
    res.status(200).json({ message: 'Mensagem marcada como lida!', message });
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao marcar mensagem como lida.' });
  }
});


// Define a porta do servidor, usando a variável de ambiente PORT ou a porta 3001 como padrão
const PORT = process.env.PORT || 3001;

// Inicia o servidor e escuta na porta definida
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
  console.log('Para acessar, abra seu navegador em: http://localhost:' + PORT);
});
