const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
// A porta é gerida pela Vercel, por isso não precisamos da variável 'port' aqui.

// Carrega os posts do ficheiro JSON
let posts = [];
try {
    // ALTERAÇÃO 1: Usar path.join(__dirname, ...) para um caminho mais fiável
    const postsPath = path.join(__dirname, 'posts.json');
    const postsData = fs.readFileSync(postsPath, 'utf8');
    posts = JSON.parse(postsData);
    console.log("Posts carregados com sucesso.");
} catch (error) {
    console.error("ERRO CRÍTICO: Não foi possível carregar o posts.json.", error);
    posts = [];
}

// Middlewares
app.use(cors());
app.use(express.json());

// ALTERAÇÃO 2: Usar path.join(__dirname, ...) também para a pasta 'public'
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// A rota para o posts.json continua igual, mas agora o caminho de leitura será mais robusto
app.get('/posts.json', (req, res) => {
    // O caminho aqui também usa a nova abordagem
    const postsFilePath = path.join(__dirname, 'posts.json');
    res.sendFile(postsFilePath, (err) => {
        if (err) {
            console.error("Erro ao enviar posts.json:", err);
            res.status(500).send("Não foi possível carregar os dados dos posts.");
        }
    });
});

// Função reutilizável para renderizar a página dinamicamente
function renderDynamicPage(req, res, post = null) {
    // E aqui também, para encontrar o index.html
    const templatePath = path.join(publicPath, 'index.html');
    
    fs.readFile(templatePath, 'utf8', (err, template) => {
        if (err) {
            console.error("Erro ao ler o template HTML (index.html):", err);
            return res.status(500).send('Erro interno do servidor ao ler o template da página.');
        }

        // ... O resto da sua função renderDynamicPage continua exatamente igual ...
        let pageTitle, metaDescription, imageUrl, postUrl, hydrationData;
        
        if (post) {
            pageTitle = `${post.title} | Mente Curiosa`;
            metaDescription = post.content.substring(0, 155).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;').trim() + '...';
            imageUrl = post.img;
            postUrl = `https://${req.headers.host || 'blog-mente-curiosa.vailink.pro'}${req.originalUrl}`;
            hydrationData = { currentPage: 'article', postData: post, allPosts: posts };
        } else {
            pageTitle = 'Mente Curiosa | Explore o Desconhecido';
            metaDescription = 'Explore um universo de curiosidades fascinantes. Artigos sobre história, ciência, mistérios e as maravilhas do mundo.';
            imageUrl = 'https://i.ibb.co/mrF0CGwv/Gemini-Generated-Image-jjpnkfjjpnkfjjpn-1.jpg';
            postUrl = `https://${req.headers.host || 'blog-mente-curiosa.vailink.pro'}`;
            hydrationData = { currentPage: 'home', postData: null, allPosts: posts };
        }
        
        const hydrationScript = `<script id="hydration-data" type="application/json">${JSON.stringify(hydrationData)}</script>`;

        let finalHtml = template
            .replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`)
            .replace(/<meta id="meta-description".*?>/, `<meta id="meta-description" name="description" content="${metaDescription}">`)
            .replace(/<meta id="og-title".*?>/, `<meta id="og-title" property="og:title" content="${pageTitle}">`)
            .replace(/<meta id="og-description".*?>/, `<meta id="og-description" property="og:description" content="${metaDescription}">`)
            .replace(/<meta id="og-image".*?>/, `<meta id="og-image" property="og:image" content="${imageUrl}">`)
            .replace(/<meta id="og-url".*?>/, `<meta id="og-url" property="og:url" content="${postUrl}">`)
            .replace(/<meta id="twitter-title".*?>/, `<meta name="twitter:title" content="${pageTitle}">`)
            .replace(/<meta id="twitter-description".*?>/, `<meta name="twitter:description" content="${metaDescription}">`)
            .replace(/<meta id="twitter-image".*?>/, `<meta name="twitter:image" content="${imageUrl}">`)
            .replace('', hydrationScript); 
        
        res.setHeader('Content-Type', 'text/html');
        res.send(finalHtml);
    });
}

// --- ROTAS ---

// Rota dinâmica para posts
app.get('/posts/:id/:slug', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);
    if (post) {
        renderDynamicPage(req, res, post);
    } else {
        res.redirect('/');
    }
});

// A rota da homepage
app.get('/', (req, res) => {
    renderDynamicPage(req, res);
});


// ALTERAÇÃO 3: Remover o 'app.listen' e exportar a aplicação
/*
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
*/
module.exports = app;
