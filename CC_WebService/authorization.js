const express           = require('express'),
        _               = require('lodash'),
        crypto          = require('crypto'),
        jwt             = require('jsonwebtoken'),
        jwt_express     = require('express-jwt'),
        ECDHCrypto      = require("ecdh-crypto"),
        fs              = require('fs'),
        config          = require('../config.json'),
        tools           = require('../tools'),
        kodi            = require('../kodi-controller'),
        storage         = require("../storage");

const app = module.exports = express.Router();

generateKeyPair(); //vai gerar as keys (privada e publica) e salvar como .pem
const gingaPairKey = getPairKeys();
const GINGA_PUBLIC_KEY = gingaPairKey.publicKey;
const GINGA_PRIVATE_KEY = gingaPairKey.privateKey;

const randomString = (Math.random() + 1).toString(36).substring(7);

/** inicio: funções para gerar o token jwt **/
function createIdToken(client) {
    return jwt.sign(_.omit(client, 'password'), config.secret, { expiresIn: 60*60*5 });
}

function createAccessToken() {
    return jwt.sign({
        iss: config.issuer,
        aud: config.audience,
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
        scope: 'full_access',
        sub: "",
        jti: genJti(),
        alg: 'HS256'
    }, config.secret);
}

function createRefreshToken(client) {
    return jwt.sign(
        client,
        config.refreshTokenSecret,
        { expiresIn: config.refreshTokenLife}
    );
}

function genJti() {
    let jti = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 16; i++) {
        jti += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return jti;
}

function getUserScheme(req) {
    let username;
    let type;
    let userSearch = {};

    if(req.body.username) {
        username = req.body.username;
        type = 'username';
        userSearch = { username: username };
    } else if(req.body.email) {
        username = req.body.email;
        type = 'email';
        userSearch = { email: username };
    }

    return {
        username: username,
        type: type,
        userSearch: userSearch
    }
}
/** fim: funções para gerar o token jwt **/


/** inicio: funções auxiliares **/
function generateKeyPair() {
    var privateKey = ECDHCrypto.createECDHCrypto('P-256');
    var publickey = privateKey.asPublicECDHCrypto();

    fs.writeFileSync("public_key.pem", publickey.toString('pem'));
    fs.writeFileSync("private_key.pem", privateKey.toString('pem'));
}

function getPairKeys(){
    var privatePem = fs.readFileSync('private_key.pem');
    var privateKey = new ECDHCrypto(privatePem, 'pem');

    var publicPem = fs.readFileSync('public_key.pem');
    var publicKey = new ECDHCrypto(publicPem, 'pem');

    return {
        privateKey: privateKey.toString('rfc5208'),
        publicKey: publicKey.toString('rfc5280')
    }
}

function generateX509Cert() {
    const forge = require('node-forge');
    const pki = forge.pki;

    var keys = pki.rsa.generateKeyPair(2048); //só consegui gerar o certificando usando chaves do tipo rsa (as chaves geradas nas etapas anteriores são do tipo ecdh)

    var cert = pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    var attrs = [{
        name: 'commonName',
        value: 'dtvplay.org'
    }, {
        name: 'countryName',
        value: 'BR'
    }, {
        shortName: 'ST',
        value: 'Minas Gerais'
    }, {
        name: 'localityName',
        value: 'Rio Pomba'
    }, {
        name: 'organizationName',
        value: 'IF Sudeste MG'
    }, {
        shortName: 'OU',
        value: 'DTV Play'
    }];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey);
    return encodeURIComponent(pki.certificateToPem(cert));
}

async function getChallenge() {
    return 'indisponivel'
}

async function isFirstAccess(appid) {
    const application = storage.selectApplication(appid);
    return (!application);
}

async function isApplicationAuthorized(appid) {
    const application = storage.selectApplication(appid);
    if (application !== false) return (application.is_authorized === 1);
    else return false;
}

async function isApplicationPaired(appid) {
    const application = storage.selectApplication(appid);
    if (application !== false) return (application.is_paired === 1);
    else return false;
}

async function generatePinCode(client_public_key) {
    var privateKeyGinga = await new ECDHCrypto(fs.readFileSync('private_key.pem'), 'pem');
    var publicKeyClient = await new ECDHCrypto(client_public_key, 'rfc5280');
    var sharedSecret = await privateKeyGinga.computeSecret(publicKeyClient).toString('hex');

    var hash = crypto.createHash('sha256');
    sharedSecret = hash.update(sharedSecret);
    sharedSecret = hash.digest(sharedSecret);
    const code = sharedSecret.toString('hex');
    return (parseInt(code, 16) % 10000) > 999 ? (parseInt(code, 16) % 10000) : generatePinCode(client_public_key);
}

async function displayPinCode(displayName, pin){
    await kodi.prototype.pin(displayName, pin);
}
function isset(arr){
    return typeof arr !== 'undefined';
}
/** fim: funções auxiliares **/


app.get("/dtv/authorize", async function (req, res) {
    const query = req.query;
    let error = [];

    if (isset(query['pm'])){
        if (query['pm'] !== 'kex' && query['pm'] !== 'qrcode') {
            error.push(101);
        } else if (query['pm'] !== 'kex'){
            if (query['kxp'] !== 'ecdh') {
                error.push(101);
            }
        }
    }

    if (!isset(query['appid']) || !isset(query['display-name'])){
        error.push(105);
    }

    if (error.length > 0) {
        res.status(error[0]).end();
    } else {
        const firstAccess = await isFirstAccess(query['appid']); //verifica se é a primeira vez que o cliente acessa o app
        const isAuthorized = await isApplicationAuthorized(query['appid']);
        const challenge = await getChallenge(); //gera o challenge

        if (isAuthorized === false) {
            const newApplication = {
                application_id: query['appid'],
                application_name: query['display-name'],
                is_authorized: false,
                is_paired: false
            }
            storage.insertApplication(newApplication);

            await kodi.prototype
                .authorization(query['display-name'], query['appid']) //exibe o popup de autorização
                .then(async () =>
                {
                    await tools.sleep(10000); //aguarda por 10s a resposta do cliente
                    const isNowAuthorized =   await isApplicationAuthorized(query['appid']); //verifica a resposta da autorização

                    if (isNowAuthorized === false) {
                        storage.deleteApplication(newApplication);
                        error.push(102);
                    }
                }).catch(e =>
                    error.push(103)
                );
        }

        if (error.length > 0) {
            res.status(error[0]).end();
        } else {
            const isPaired = await isApplicationPaired(query['appid']); //verifica se a aplicação já está pareada
            if (isPaired === false) {
                if (query['pm'] === 'kex') {
                    let pincode = await generatePinCode(decodeURIComponent(query['key'])); //gera o pincode e o exibe na tela
                    await displayPinCode(query['display-name'], pincode);
                }
            }

            res.status(201).send({
                firstAccess: firstAccess,
                challenge: challenge,
                key: GINGA_PUBLIC_KEY
            });
        }
    }
});

app.get("/dtv/token", async function (req, res) {
    const query = req.query;

    const updateApplication = {
        application_id: query['appid'],
        is_authorized: true,
        is_paired: true
    }
    storage.insertApplication(updateApplication);

    await kodi.prototype.closePinWindow();

    const application = storage.selectApplication(query['appid']);
    const isApplicationExists = (application !== false);

    if (isApplicationExists === false){
        res.status(101).end();
    } else {
        const client = {
            appid: application.application_id,
            application_name: application.application_name
        };

        const accessToken = createAccessToken();
        const refreshToken = createRefreshToken(client);

        res.status(201).send({
            accessToken: accessToken,
            tokenType: 'Bearer',
            expiresIn: config.tokenLife,
            refreshToken: refreshToken,
            serverCert: generateX509Cert()
        });
    }
});