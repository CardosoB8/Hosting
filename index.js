const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Carrega os posts do ficheiro JSON uma única vez na inicialização
let posts = [];
try {
    const postsPath = path.resolve(process.cwd(), 'posts.json');
    const postsData = fs.readFileSync(postsPath, 'utf8');
    posts = JSON.parse(postsData);
    console.log("Posts carregados com sucesso do posts.json.");
} catch (error) {
    console.error("ERRO CRÍTICO: Não foi possível carregar o ficheiro posts.json. Verifique se o ficheiro existe na raiz do projeto.", error);
    posts = []; // Garante que posts seja um array vazio para evitar crashes
}

// Middlewares
app.use(cors());
app.use(express.json());

// Define o caminho para a pasta 'public' onde estão os ficheiros estáticos
const publicPath = path.resolve(process.cwd(), 'public');

// Serve os ficheiros estáticos que estão dentro da pasta 'public'
app.use(express.static(publicPath));

// Cria uma rota específica para o navegador poder aceder ao posts.json
app.get('/posts.json', (req, res) => {
    const postsFilePath = path.resolve(process.cwd(), 'posts.json');
    res.sendFile(postsFilePath);
});

// Função reutilizável para renderizar a página dinamicamente
function renderDynamicPage(req, res, post = null) {
    const templatePath = path.resolve(publicPath, 'index.html');
    
    fs.readFile(templatePath, 'utf8', (err, template) => {
        if (err) {
            console.error("Erro ao ler o template HTML (index.html):", err);
            return res.status(500).send('Erro interno do servidor ao ler o template da página.');
        }

        let pageTitle, metaDescription, imageUrl, postUrl, hydrationData;
        
        if (post) {
            // Se for uma página de artigo
            pageTitle = `${post.title} | Mente Curiosa`;
            metaDescription = post.content.substring(0, 155).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;').trim() + '...';
            imageUrl = post.img;
            postUrl = `https://${req.headers.host || 'blog-mente-curiosa.vailink.pro'}${req.originalUrl}`;
            hydrationData = { currentPage: 'article', postData: post, allPosts: posts };
        } else {
            // Se for a página principal (homepage)
            pageTitle = 'Mente Curiosa | Explore o Desconhecido';
            metaDescription = 'Explore um universo de curiosidades fascinantes. Artigos sobre história, ciência, mistérios e as maravilhas do mundo.';
            imageUrl = 'https://i.ibb.co/mrF0CGwv/Gemini-Generated-Image-jjpnkfjjpnkfjjpn-1.jpg';
            postUrl = `https://${req.headers.host || 'blog-mente-curiosa.vailink.pro'}`;
            hydrationData = { currentPage: 'home', postData: null, allPosts: posts };
        }
        
        const hydrationScript = `<script id="hydration-data" type="application/json">${JSON.stringify(hydrationData)}</script>`;

        // Substitui os placeholders no template com as informações corretas
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
            .replace('<!--HYDRATION_STATE-->', hydrationScript); 
        
        res.setHeader('Content-Type', 'text/html');
        res.send(finalHtml);
    });
}

// --- ROTAS ---

// Rota dinâmica para posts
// Esta rota precisa ser registrada ANTES de rotas mais genéricas como a da homepage
app.get('/posts/:id/:slug', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);
    if (post) {
        renderDynamicPage(req, res, post);
    } else {
        // Se o post não for encontrado, redireciona para a home
        res.redirect('/');
    }
});

// A rota da homepage deve ser uma das últimas para não capturar outras rotas
app.get('/', (req, res) => {
    renderDynamicPage(req, res);
});


// Iniciar Servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
