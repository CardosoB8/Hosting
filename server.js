const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// Carrega os posts do ficheiro JSON
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

// Middlewares
app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Função reutilizável para renderizar a página principal (casca)
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
            // ... (as outras substituições de meta tags continuam aqui)
            .replace('', hydrationScript); 
        
        res.setHeader('Content-Type', 'text/html');
        res.send(finalHtml);
    });
}

// --- ROTAS ---

// Rota para o sitemap.xml (ótimo para SEO)
app.get('/sitemap.xml', (req, res) => {
    const baseUrl = 'https://blog-mente-curiosa.vailink.pro'; // Substitua pelo seu URL final
    let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    
    const pages = ['/', '/sobre-nos', '/categorias'];
    pages.forEach(page => {
        xml += `<url><loc>${baseUrl}${page}</loc></url>`;
    });

    posts.forEach(post => {
        const postSlug = post.title.toString().toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, '')
          .replace(/\-\-+/g, '-')
          .replace(/^-+/, '')
          .replace(/-+$/, '');
        xml += `<url><loc>${baseUrl}/posts/${post.id}/${postSlug}</loc><lastmod>${post.date}</lastmod></url>`;
    });

    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
});

// Rota para o ficheiro de posts
app.get('/posts.json', (req, res) => {
    const postsFilePath = path.join(__dirname, 'posts.json');
    res.sendFile(postsFilePath);
});

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

// Rotas para as páginas principais, para que funcionem ao recarregar
app.get('/categorias', (req, res) => renderDynamicPage(req, res));
app.get('/categorias/:slug', (req, res) => renderDynamicPage(req, res));
app.get('/sobre-nos', (req, res) => renderDynamicPage(req, res));
app.get('/tags/:slug', (req, res) => renderDynamicPage(req, res));

// A rota da homepage
app.get('/', (req, res) => {
    renderDynamicPage(req, res);
});

// Exporta a app para a Vercel
module.exports = app;
