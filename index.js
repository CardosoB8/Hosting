// server.js

// --- DEPENDÊNCIAS ---
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { createWorker } = require('tesseract.js');

// --- CONFIGURAÇÃO INICIAL ---
const app = express();
const port = 3000;

// --- CARREGAMENTO CENTRALIZADO DE DADOS ---
// O servidor agora lê o ficheiro posts.json como a sua única fonte de verdade.
let posts = [];
try {
    const postsData = fs.readFileSync(path.join(__dirname, 'posts.json'), 'utf8');
    posts = JSON.parse(postsData);
    console.log("Posts carregados com sucesso.");
} catch (error) {
    console.error("Erro ao carregar posts.json:", error);
    // Se não conseguir carregar os posts, o servidor não deve iniciar com funcionalidades quebradas.
    process.exit(1); 
}

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/', limits: { fileSize: 5 * 1024 * 1024 } }));

// Serve ficheiros estáticos (CSS, JS do cliente, imagens) da pasta 'public'
// Adicionado um endpoint para servir o posts.json para o cliente
app.use('/posts.json', express.static(path.join(__dirname, 'posts.json')));
app.use(express.static('public'));

// --- ROTAS ESTÁTICAS E DINÂMICAS ---

// Rota Principal e outras páginas estáticas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/oferta', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'oferta.html'));
});

// Nova Rota Dinâmica para Posts (Server-Side Rendering)
app.get('/posts/:id/:slug', (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find(p => p.id === postId);

  if (!post) {
    return res.status(404).redirect('/');
  }

  const templatePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(templatePath, 'utf8', (err, data) => {
    if (err) {
      console.error("Erro ao ler o template HTML:", err);
      return res.status(500).send('Erro ao carregar a página.');
    }

    // Gera o HTML dinamicamente substituindo os placeholders
    const pageTitle = `${post.title} | Mente Curiosa`;
    const metaDescription = post.content.substring(0, 155).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;') + '...';
    const postUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    
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

// --- SUAS APIs EXISTENTES (Integradas e inalteradas) ---
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
  console.log(`Servidor rodando em http://localhost:${port}`);
});
