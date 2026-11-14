
import express from 'express';
import cors from 'cors';
import  errorHandler  from './errors/errorHandler.js';
import alunoRoutes from './routes/aluno.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/alunos', alunoRoutes);

// Futuramente:
// app.use('/api/avaliacoes', avaliacoesRoutes);
// app.use('/api/resultados', resultadosRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API ProvaViva funcionando!'
  });
});

app.use(errorHandler);

export default app;
