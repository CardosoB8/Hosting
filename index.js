// server.js (Versão Simplificada para Teste)

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Carrega os posts do ficheiro JSON
let posts = [];
try {
    const postsPath = path.resolve(process.cwd(), 'posts.json');
    const postsData = fs.readFileSync(postsPath, 'utf8');
    posts = JSON.parse(postsData);
    console.log("Posts carregados com sucesso.");
} catch (error) {
    console.error("ERRO CRÍTICO: Não foi possível carregar o ficheiro posts.json.", error);
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Rota para o servidor fornecer o ficheiro posts.json ao cliente
app.get('/posts.json', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'posts.json'));
});

// Função reutilizável para renderizar a página dinamicamente
function renderDynamicPage(req, res, post = null) {
    const templatePath = path.resolve(process.cwd(), 'public', 'index.html');
    
    fs.readFile(templatePath, 'utf8', (err, template) => {
        if (err) {
            return res.status(500).send('Erro interno do servidor ao ler o template.');
        }

        let pageTitle, metaDescription, imageUrl, postUrl;
        
        if (post) {
            // Página de Artigo
            pageTitle = `${post.title} | Mente Curiosa`;
            metaDescription = post.content.substring(0, 155).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;') + '...';
            imageUrl = post.img;
            postUrl = `https://${req.get('host')}${req.originalUrl}`;
        } else {
            // Página Principal
            pageTitle = 'Mente Curiosa | Explore o Desconhecido';
            metaDescription = 'Explore um universo de curiosidades fascinantes. Artigos sobre história, ciência, mistérios e as maravilhas do mundo.';
            imageUrl = 'https://i.ibb.co/mrF0CGwv/Gemini-Generated-Image-jjpnkfjjpnkfjjpn-1.jpg';
            postUrl = `https://${req.get('host')}`;
        }
        
        let finalHtml = template
            .replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`)
            .replace(/<meta id="meta-description".*?>/, `<meta id="meta-description" name="description" content="${metaDescription}">`)
            .replace(/<meta id="og-title".*?>/, `<meta id="og-title" property="og:title" content="${pageTitle}">`)
            .replace(/<meta id="og-description".*?>/, `<meta id="og-description" property="og:description" content="${metaDescription}">`)
            .replace(/<meta id="og-image".*?>/, `<meta id="og-image" property="og:image" content="${imageUrl}">`)
            .replace(/<meta id="og-url".*?>/, `<meta id="og-url" property="og:url" content="${postUrl}">`);
        
        res.send(finalHtml);
    });
}

// --- ROTAS PRINCIPAIS ---
app.get('/', (req, res) => {
    renderDynamicPage(req, res);
});

app.get('/posts/:id/:slug', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);
    if (post) {
        renderDynamicPage(req, res, post);
    } else {
        res.status(404).redirect('/');
    }
});

app.get('/oferta', (req, res) => {
  res.sendFile(path.resolve(process.cwd(), 'public', 'oferta.html'));
});

// --- INICIAR SERVIDOR ---
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
