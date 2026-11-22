
import express from 'express';
import cors from 'cors';
import errorHandler from './errors/errorHandler.js';
import alunoRoutes from './routes/aluno.routes.js';
import professorRoutes from './routes/professor.routes.js';
import avaliacaoRoutes from './routes/avaliacao.routes.js';
import authRoutes from './routes/auth.routes.js';
import autenticarProfessor from './middlewares/autenticarProfessor.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/alunos', autenticarProfessor, alunoRoutes);
app.use('/api/professores', professorRoutes);
app.use('/api/avaliacoes', autenticarProfessor, avaliacaoRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API ProvaViva funcionando!'
  });
});

app.use(errorHandler);

export default app;
