// server.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { createWorker } = require('tesseract.js');

const app = express();
const port = process.env.PORT || 3000; // Vercel define a porta

// --- CARREGAMENTO CENTRALIZADO DE DADOS ---
// Corrigido para funcionar no ambiente Vercel
let posts = [];
try {
    const postsPath = path.resolve(process.cwd(), 'posts.json');
    const postsData = fs.readFileSync(postsPath, 'utf8');
    posts = JSON.parse(postsData);
    console.log("Posts carregados com sucesso.");
} catch (error) {
    console.error("Erro ao carregar posts.json:", error);
}

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/', limits: { fileSize: 5 * 1024 * 1024 } }));

// Serve ficheiros estáticos da pasta 'public'
const publicPath = path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath));
app.use('/posts.json', express.static(path.resolve(process.cwd(), 'posts.json')));


// --- ROTAS ---

// Rota para a página de oferta
app.get('/oferta', (req, res) => {
  res.sendFile(path.resolve(publicPath, 'oferta.html'));
});

// Rota Dinâmica para Posts (Server-Side Rendering)
app.get('/posts/:id/:slug', (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find(p => p.id === postId);

  if (!post) {
    return res.status(404).redirect('/');
  }

  const templatePath = path.resolve(publicPath, 'index.html');
  fs.readFile(templatePath, 'utf8', (err, data) => {
    if (err) {
      console.error("Erro ao ler o template HTML:", err);
      return res.status(500).send('Erro ao carregar a página.');
    }
    
    // Gera o HTML dinamicamente
    const pageTitle = `${post.title} | Mente Curiosa`;
    const metaDescription = post.content.substring(0, 155).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;') + '...';
    const postUrl = `https://${req.get('host')}${req.originalUrl}`;
    
    // Substituições no template
    let finalHtml = data
        .replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`)
        .replace(/<meta id="meta-description".*?>/, `<meta id="meta-description" name="description" content="${metaDescription}">`)
        .replace(/<meta id="og-title".*?>/, `<meta id="og-title" property="og:title" content="${pageTitle}">`)
        .replace(/<meta id="og-description".*?>/, `<meta id="og-description" property="og:description" content="${metaDescription}">`)
        .replace(/<meta id="og-image".*?>/, `<meta id="og-image" property="og:image" content="${post.img}">`)
        .replace(/<meta id="og-url".*?>/, `<meta id="og-url" property="og:url" content="${postUrl}">`)
        .replace(/<meta id="twitter-title".*?>/, `<meta name="twitter:title" content="${pageTitle}">`)
        .replace(/<meta id="twitter-description".*?>/, `<meta name="twitter:description" content="${metaDescription}">`)
        .replace(/<meta id="twitter-image".*?>/, `<meta name="twitter:image" content="${post.img}">`);
    
    res.send(finalHtml);
  });
});

// Rota Principal (deve ser a última rota de 'GET' normal)
app.get('/', (req, res) => {
  res.sendFile(path.resolve(publicPath, 'index.html'));
});


// --- SUAS APIs EXISTENTES ---
app.post('/api/ocr', async (req, res) => {
  try {
    if (!req.files || !req.files.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const worker = await createWorker({ logger: m => console.log(m) });
    await worker.load();
    await worker.loadLanguage('por');
    await worker.initialize('por');
    const { data: { text } } = await worker.recognize(req.files.file.tempFilePath);
    await worker.terminate();
    res.json({ text });
  } catch (error) {
    console.error('Erro no OCR:', error);
    res.status(500).json({ error: 'Erro ao processar a imagem', details: error.message });
  }
});

app.post('/api/validate', (req, res) => {
  try {
    const { text } = req.body;
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const requiredWords = ['REGISTADO', formattedDate];
    const hasAllRequired = requiredWords.every((w) => text.includes(w));
    const isValid = hasAllRequired || text.includes('GANHE');
    if (isValid) {
      res.json({ approved: true, guideLink: 'https://www.mediafire.com/file/zvy5z1jdow995aj/10_Ferramentas_de_Apostas_online_para_iniciantes.pdf/file' });
    } else {
      res.json({ approved: false, message: 'Erro na validação. Verifique as condições e tente novamente.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro na validação', details: error.message });
  }
});


// --- INICIAR SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
