
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Futuramente:
// app.use('/api/alunos', alunosRoutes);
// app.use('/api/avaliacoes', avaliacoesRoutes);
// app.use('/api/resultados', resultadosRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API ProvaViva funcionando!'
  });
});

export default app;
