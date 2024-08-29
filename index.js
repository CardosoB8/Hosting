const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const admin = require('firebase-admin'); // Importa o Firebase Admin SDK
require('dotenv').config();

// Inicializar o Firebase
admin.initializeApp({
    credential: admin.credential.cert({
        "type": process.env.FIREBASE_TYPE,
        "project_id": process.env.FIREBASE_PROJECT_ID,
        "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
        "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        "client_email": process.env.FIREBASE_CLIENT_EMAIL,
        "client_id": process.env.FIREBASE_CLIENT_ID,
        "auth_uri": process.env.FIREBASE_AUTH_URI,
        "token_uri": process.env.FIREBASE_TOKEN_URI,
        "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
        "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database(); // Referência ao Firebase Realtime Database

const app = express();
const port = process.env.PORT || 3000;

// Configuração do multer para salvar arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
});

// Middleware de segurança
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('uploads'));
app.set('view engine', 'ejs');

// Configurar rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // Limite de 100 requisições por IP
});
app.use(limiter);

// Rota para página de upload protegida por senha
app.get('/', (req, res) => {
    res.render('index'); // Renderiza a página principal
});

// Rota para processar o upload com alias personalizado e senha
app.post('/upload', upload.single('file'), (req, res) => {
    const { alias, htmlContent, password } = req.body;

    // Validação básica de alias
    if (!alias || !alias.match(/^[a-zA-Z0-9]+$/)) {
        return res.status(400).send('Alias deve ser alfanumérico.');
    }

    // Verificar a senha
    if (password !== process.env.UPLOAD_PASSWORD) {
        return res.status(403).send('Senha incorreta.');
    }

    // Verificar alias duplicado no Firebase
    db.ref('aliases/' + alias).once('value', snapshot => {
        if (snapshot.exists()) {
            return res.status(400).send('Alias já em uso.');
        }

        let htmlFileName = `uploads/${alias}.html`;

        // Salvar o código HTML em um arquivo
        if (htmlContent) {
            fs.writeFileSync(htmlFileName, htmlContent);
        }

        // Salvar alias e caminho no Firebase
        db.ref('aliases/' + alias).set(htmlFileName)
            .then(() => {
                // Gera o link com o alias personalizado
                const link = `${req.protocol}://${req.get('host')}/${alias}.com`;
                res.send(`Upload realizado com sucesso. Acesse seu conteúdo em: <a href="${link}">${link}</a>`);
            })
            .catch(error => {
                res.status(500).send('Erro ao salvar no Firebase.');
            });
    });
});

// Rota para servir arquivos HTML usando alias
app.get('/:alias.com', (req, res) => {
    const alias = req.params.alias;

    // Busca o caminho do arquivo no Firebase usando o alias
    db.ref('aliases/' + alias).once('value', snapshot => {
        const filepath = snapshot.val();
        
        if (!filepath) {
            return res.status(404).send('Alias não encontrado.');
        }

        res.sendFile(path.join(__dirname, filepath));
    });
});

// Criação da pasta de uploads se não existir
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
