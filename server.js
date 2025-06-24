const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Carrega os posts do ficheiro JSON uma única vez
let posts = [];
try {
    const postsPath = path.resolve(process.cwd(), 'posts.json');
    const postsData = fs.readFileSync(postsPath, 'utf8');
    posts = JSON.parse(postsData);
    console.log("Posts carregados com sucesso.");
} catch (error) {
    console.error("ERRO CRÍTICO: Não foi possível carregar posts.json.", error);
}

// Middlewares
app.use(cors());
app.use(express.json());

// A única responsabilidade deste servidor agora é a rota dinâmica de posts
app.get('/posts/:id/:slug', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);

    if (!post) {
        return res.status(404).redirect('/');
    }

    const templatePath = path.resolve(process.cwd(), 'public', 'index.html');
    
    fs.readFile(templatePath, 'utf8', (err, template) => {
        if (err) {
            console.error("Erro ao ler o template HTML:", err);
            return res.status(500).send('Erro interno do servidor.');
        }

        const pageTitle = `${post.title} | Mente Curiosa`;
        const metaDescription = post.content.substring(0, 155).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;').trim() + '...';
        const postUrl = `https://${req.headers.host}${req.originalUrl}`;
        
        const finalHtml = template
            .replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`)
            .replace(/<meta id="meta-description".*?>/, `<meta name="description" content="${metaDescription}" id="meta-description">`)
            .replace(/<meta id="og-title".*?>/, `<meta property="og:title" content="${pageTitle}" id="og-title">`)
            .replace(/<meta id="og-description".*?>/, `<meta property="og:description" content="${metaDescription}" id="og-description">`)
            .replace(/<meta id="og-image".*?>/, `<meta property="og:image" content="${post.img}" id="og-image">`)
            .replace(/<meta id="og-url".*?>/, `<meta property="og:url" content="${postUrl}" id="og-url">`)
            .replace(/<meta id="twitter-title".*?>/, `<meta name="twitter:title" content="${pageTitle}" id="twitter-title">`)
            .replace(/<meta id="twitter-description".*?>/, `<meta name="twitter:description" content="${metaDescription}" id="twitter-description">`)
            .replace(/<meta id="twitter-image".*?>/, `<meta name="twitter:image" content="${post.img}" id="twitter-image">`);

        res.setHeader('Content-Type', 'text/html');
        res.send(finalHtml);
    });
});

// O servidor já não precisa de rotas para '/', '/oferta', etc.
// O novo vercel.json trata disso, servindo diretamente da pasta /public.

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
