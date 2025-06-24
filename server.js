const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

let posts = [];
try {
    const postsPath = path.join(__dirname, 'posts.json');
    const postsData = fs.readFileSync(postsPath, 'utf8');
    posts = JSON.parse(postsData);
    console.log("Posts carregados com sucesso.");
} catch (error) {
    console.error("ERRO CRÍTICO: Não foi possível carregar o posts.json.", error);
    posts = [];
}

app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

function renderDynamicPage(req, res, post = null) {
    const templatePath = path.join(publicPath, 'index.html');
    
    fs.readFile(templatePath, 'utf8', (err, template) => {
        if (err) {
            console.error("Erro ao ler o template HTML (index.html):", err);
            return res.status(500).send('Erro interno do servidor ao ler o template da página.');
        }

        let pageTitle, metaDescription, imageUrl, postUrl, hydrationData;
        
        if (post) {
            pageTitle = `${post.title} | Mente Curiosa`;
            metaDescription = post.content.substring(0, 155).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;').trim() + '...';
            imageUrl = post.img;
            postUrl = `https://${req.headers.host}${req.originalUrl}`;
            hydrationData = { currentPage: 'article', postData: post, allPosts: posts };
        } else {
            pageTitle = 'Mente Curiosa | Explore o Desconhecido';
            metaDescription = 'Explore um universo de curiosidades fascinantes. Artigos sobre história, ciência, mistérios e as maravilhas do mundo.';
            imageUrl = 'https://i.ibb.co/mrF0CGwv/Gemini-Generated-Image-jjpnkfjjpnkfjjpn-1.jpg';
            postUrl = `https://${req.headers.host}${req.originalUrl}`;
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

app.get('/posts.json', (req, res) => res.sendFile(path.join(__dirname, 'posts.json')));

app.get('/posts/:id/:slug', (req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (post) renderDynamicPage(req, res, post); else res.redirect('/');
});

app.get('/categorias', (req, res) => renderDynamicPage(req, res));
app.get('/categorias/:slug', (req, res) => renderDynamicPage(req, res));
app.get('/sobre-nos', (req, res) => renderDynamicPage(req, res));
app.get('/tags/:slug', (req, res) => renderDynamicPage(req, res));
app.get('/', (req, res) => renderDynamicPage(req, res));

module.exports = app;
