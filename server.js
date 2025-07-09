const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Certifique-se de que o CORS está instalado (npm install cors)

const app = express();

// --- 1. Definir o caminho da pasta public ---
const publicPath = path.join(__dirname, 'public');

// --- 2. Carregar os posts.json do diretório public ---
let posts = [];
try {
    const postsPath = path.join(publicPath, 'posts.json'); // AGORA BUSCA DENTRO DE PUBLIC
    const postsData = fs.readFileSync(postsPath, 'utf8');
    posts = JSON.parse(postsData);
    console.log("Posts carregados com sucesso do diretório public.");
} catch (error) {
    console.error("ERRO CRÍTICO: Não foi possível carregar o posts.json do diretório public.", error);
    posts = [];
}

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- 3. Servir arquivos estáticos ANTES das rotas dinâmicas ---
// Isso permite que requests para '/posts.json' sejam atendidas diretamente
// se o arquivo estiver em 'public'.
app.use(express.static(publicPath));

// Função auxiliar para criar slugs (se você não tiver no seu frontend ou quiser garantir consistência)
function createSlug(text) {
    if (!text) return '';
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
    const p = new RegExp(a.split('').join('|'), 'g');
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c)))  // Replace special characters
        .replace(/&/g, '-and-')         // Replace & with 'and'
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}


// Função para renderizar páginas dinâmicas com hidratação
function renderDynamicPage(req, res, pageType, post = null) {
    const templatePath = path.join(publicPath, 'index.html');

    fs.readFile(templatePath, 'utf8', (err, template) => {
        if (err) {
            console.error("Erro ao ler o template HTML (index.html):", err);
            return res.status(500).send('Erro interno do servidor ao ler o template da página.');
        }

        let pageTitle, metaDescription, imageUrl, currentUrl, hydrationData;

        // Definindo dados padrão para o site
        const defaultTitle = 'Mente Curiosa | Explore o Desconhecido';
        const defaultDescription = 'Explore um universo de curiosidades fascinantes. Artigos sobre história, ciência, mistérios e as maravilhas do mundo. A sua jornada pelo conhecimento começa aqui.';
        const defaultImage = 'https://i.ibb.co/mrF0CGwv/Gemini-Generated-Image-jjpnkfjjpnkfjjpn-1.jpg';
        const baseUrl = `https://${req.headers.host}`;

        // Dados base para todas as páginas
        pageTitle = defaultTitle;
        metaDescription = defaultDescription;
        imageUrl = defaultImage;
        currentUrl = `${baseUrl}${req.originalUrl}`;
        hydrationData = { currentPage: pageType, postData: null, allPosts: posts };

        // Sobrescrevendo dados para páginas específicas
        if (pageType === 'article' && post) {
            pageTitle = `${post.title} | Mente Curiosa`;
            // Prioriza o campo 'summary' se existir, senão corta o 'content'
            metaDescription = post.summary ? post.summary : (post.content.substring(0, 155).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;').trim() + '...');
            imageUrl = post.img;
            currentUrl = `${baseUrl}/posts/${post.id}/${createSlug(post.title)}`;
            hydrationData.postData = post;
        } else if (pageType === 'categories') {
            pageTitle = 'Categorias | Mente Curiosa';
            metaDescription = 'Navegue por todas as categorias de curiosidades no Mente Curiosa.';
        } else if (pageType === 'about') {
            pageTitle = 'Sobre Nós | Mente Curiosa';
            metaDescription = 'Conheça Cardoso Fernando, o criador do blog Mente Curiosa e sua paixão por desvendar o desconhecido.';
        } else if (pageType === 'privacy-policy') {
            pageTitle = 'Política de Privacidade | Mente Curiosa';
            metaDescription = 'Leia nossa política de privacidade para entender como coletamos, usamos e protegemos suas informações neste blog.';
        } else if (pageType === 'terms-of-use') {
            pageTitle = 'Termos de Uso | Mente Curiosa';
            metaDescription = 'Confira os termos e condições para o uso do blog Mente Curiosa.';
        } else if (pageType === 'search') {
            // Para páginas de busca ou tags, o título e descrição podem ser mais específicos
            const searchTerm = req.query.q || req.params.slug;
            pageTitle = `Resultados para "${searchTerm}" | Mente Curiosa`;
            metaDescription = `Artigos relacionados a "${searchTerm}" no blog Mente Curiosa.`;
        }


        const hydrationScript = `<script id="hydration-data" type="application/json">${JSON.stringify(hydrationData)}</script>`;

        let finalHtml = template
            .replace(/<title id="page-title">.*?<\/title>/, `<title id="page-title">${pageTitle}</title>`)
            .replace(/<meta id="meta-description".*?>/, `<meta id="meta-description" name="description" content="${metaDescription}">`)
            .replace(/<meta id="og-title".*?>/, `<meta id="og-title" property="og:title" content="${pageTitle}">`)
            .replace(/<meta id="og-description".*?>/, `<meta id="og-description" property="og:description" content="${metaDescription}">`)
            .replace(/<meta id="og-image".*?>/, `<meta id="og-image" property="og:image" content="${imageUrl}">`)
            .replace(/<meta id="og-url".*?>/, `<meta id="og-url" property="og:url" content="${currentUrl}">`)
            // Adicionado para twitter, usando os mesmos valores do Open Graph
            .replace(/<meta name="twitter:card".*?>/, `<meta name="twitter:card" content="summary_large_image">`)
            .replace(/<title id="twitter-title".*?>/, `<meta name="twitter:title" content="${pageTitle}">`) // Essa tag não existe no seu HTML atual, mas é uma boa prática adicionar
            .replace(/<meta id="twitter-description".*?>/, `<meta name="twitter:description" content="${metaDescription}">`) // Essa tag não existe no seu HTML atual, mas é uma boa prática adicionar
            .replace(/<meta id="twitter-image".*?>/, `<meta name="twitter:image" content="${imageUrl}">`) // Essa tag não existe no seu HTML atual, mas é uma boa prática adicionar

            // INSERE O SCRIPT DE HYDRATION ANTES DO FECHAMENTO DA TAG HEAD OU BODY, onde for mais apropriado
            // O seu original usava .replace('', hydrationScript) o que é um problema.
            // Vamos usar um marcador específico para inserção.
            .replace('</head>', `${hydrationScript}\n</head>`); // Inserindo antes do </head>

        res.setHeader('Content-Type', 'text/html');
        res.send(finalHtml);
    });
}

// --- Rotas Dinâmicas ---
app.get('/posts/:id/:slug', (req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (post) {
        renderDynamicPage(req, res, 'article', post);
    } else {
        // Se o post não for encontrado, renderiza a página de 404
        res.status(404);
        renderDynamicPage(req, res, '404'); // Pode criar um pageType '404' no frontend
    }
});

// Sitemap
app.get('/sitemap.xml', (req, res) => {
    try {
        const baseUrl = `https://${req.headers.host}`; // Usa o host da requisição
        let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        const pages = ['/', '/sobre-nos', '/categorias', '/politica-de-privacidade', '/termos-de-uso']; // Incluir novas páginas
        pages.forEach(page => {
            xml += `<url><loc>${baseUrl}${page}</loc></url>`;
        });

        posts.forEach(post => {
            if (!post || !post.id || !post.title || !post.date) {
                console.warn('AVISO: Post ignorado no sitemap por ter dados em falta:', post);
                return;
            }
            const postSlug = createSlug(post.title); // Usa a função createSlug
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

// Rotas para páginas estáticas ou de listagem que precisam de SSR para SEO
app.get('/categorias', (req, res) => renderDynamicPage(req, res, 'categories'));
app.get('/categorias/:slug', (req, res) => renderDynamicPage(req, res, 'search')); // Considerar como uma busca filtrada por categoria
app.get('/tags/:slug', (req, res) => renderDynamicPage(req, res, 'search')); // Considerar como uma busca filtrada por tag
app.get('/sobre-nos', (req, res) => renderDynamicPage(req, res, 'about'));
app.get('/politica-de-privacidade', (req, res) => renderDynamicPage(req, res, 'privacy-policy'));
app.get('/termos-de-uso', (req, res) => renderDynamicPage(req, res, 'terms-of-use'));

// Rota para pesquisa que usa o query param 'q'
app.get('/pesquisa', (req, res) => renderDynamicPage(req, res, 'search'));

// --- Rota Home (geralmente a última para SSR simples) ---
app.get('/', (req, res) => renderDynamicPage(req, res, 'home'));

// --- Rota de fallback para SPA (DEVE SER A ÚLTIMA ROTA) ---
// Qualquer requisição que não foi atendida pelas rotas acima
// e que não seja um arquivo estático em 'public', será redirecionada para index.html
// Isso é crucial para que as URLs do SPA (ex: /posts/1/titulo) funcionem no refresh
// ou ao serem digitadas diretamente.
app.get('*', (req, res) => {
    // Para casos de 404, o frontend JS vai renderizar a página 404
    // Mas o servidor ainda entrega o index.html para o SPA assumir.
    res.sendFile(path.join(publicPath, 'index.html'));
});


module.exports = app;
