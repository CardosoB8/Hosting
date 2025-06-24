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

function renderDynamicPage(req, res, post = null) {
    const templatePath = path.join(publicPath, 'index.html');
    fs.readFile(templatePath, 'utf8', (err, template) => {
        if (err) {
            console.error("Erro ao ler o template HTML (index.html):", err);
            return res.status(500).send('Erro interno do servidor ao ler o template da página.');
        }
        // ... (código de substituição de meta tags)
        let finalHtml = template; // Simplificado para o exemplo
        res.setHeader('Content-Type', 'text/html');
        res.send(finalHtml);
    });
}

// --- ROTAS ---

app.get('/sitemap.xml', (req, res) => {
    try {
        const baseUrl = 'https://blog-mente-curiosa.vailink.pro';
        let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        
        const pages = ['/', '/sobre-nos', '/categorias'];
        pages.forEach(page => {
            xml += `<url><loc>${baseUrl}${page}</loc></url>`;
        });

        posts.forEach(post => {
            // ==================================================================
            // ESTA É A CORREÇÃO ESSENCIAL QUE PREVINE O CRASH
            // Se o post não tiver os campos essenciais, ignora-o e continua.
            if (!post || !post.id || !post.title || !post.date) {
                console.warn('AVISO: Post ignorado no sitemap por ter dados em falta:', post);
                return; // 'return' aqui dentro do forEach funciona como 'continue'
            }
            // ==================================================================

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
    } catch (e) {
        console.error("ERRO FATAL ao gerar sitemap:", e);
        res.status(500).send("Erro interno ao gerar o sitemap.");
    }
});

// Outras rotas
app.get('/posts.json', (req, res) => res.sendFile(path.join(__dirname, 'posts.json')));
app.get('/posts/:id/:slug', (req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if(post) renderDynamicPage(req, res, post); else res.redirect('/');
});
app.get('/categorias', (req, res) => renderDynamicPage(req, res));
app.get('/categorias/:slug', (req, res) => renderDynamicPage(req, res));
app.get('/sobre-nos', (req, res) => renderDynamicPage(req, res));
app.get('/tags/:slug', (req, res) => renderDynamicPage(req, res));
app.get('/', (req, res) => renderDynamicPage(req, res));

module.exports = app;
