const express           = require('express'),
        _               = require('lodash'),
        crypto          = require('crypto'),
        ecdh            = require('ecdh'),
        jwt             = require('jsonwebtoken'),
        jwt_express     = require('express-jwt'),
        config          = require('../config.json'),
        tools           = require('../tools'),
        kodi            = require('../kodi-controller'),
        db              = require("../db");

const app = module.exports = express.Router();

const CLI_PUBLIC_KEY = '3039f7f3cb546c277b6d6823092f2afb4f8a9069b25f97f55b8149e2d0171ec86c5ddb124ad0714ee564f6d31b0c414e933e77ab1db0d2f021baef46cc525298'; //temporario, remover dps
const GINGA_PUBLIC_KEY = '082dfa5c368fd8d8f45b7fa900658438382b6d97304d32b3cb2e4f0f7fc6c62690e839e595ff1b6f9333cfe533ef6cfc1dad7a5e6646801cdd89ccd496d35609';
const GINGA_PRIVATE_KEY = 'fa5cc67766a68c72f7ed6211f4165b1d184f5aa4d72bc5b279dbfb58f2247914';


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
async function getChallenge(client_public_key) {
    // const curve = ecdh.getCurve('secp256k1');
    //
    // const gingaKeys = {
    //     publicKey: ecdh.PublicKey.fromBuffer(curve, await tools.hexToBuffer(GINGA_PUBLIC_KEY)),
    //     privateKey: ecdh.PrivateKey.fromBuffer(curve, await tools.hexToBuffer(GINGA_PRIVATE_KEY))
    // };
    // const clientKeys = {
    //     publicKey: ecdh.PublicKey.fromBuffer(curve, await tools.hexToBuffer(client_public_key))
    // };
    // const gingaSharedSecret = gingaKeys.privateKey.deriveSharedSecret(clientKeys.publicKey);
    return null;
}


async function isFirstAccess(appid) {
    const application = await db.selectApplication(appid);
    return (application.length > 0 ? false : true);
}

async function isApplicationAuthorized(appid) {
    const application = await db.selectApplication(appid);
    if (application.length > 0) return (application[0].is_authorized === 1);
    else return false;
}

async function isApplicationPaired(appid) {
    const application = await db.selectApplication(appid);
    if (application.length > 0) return (application[0].is_paired === 1);
    else return false;
}

async function generatePinCode(client_public_key) {
    const curve = ecdh.getCurve('secp256k1');

    const gingaKeys = {
        publicKey: ecdh.PublicKey.fromBuffer(curve, await tools.hexToBuffer(GINGA_PUBLIC_KEY)),
        privateKey: ecdh.PrivateKey.fromBuffer(curve, await tools.hexToBuffer(GINGA_PRIVATE_KEY))
    };
    const clientKeys = {
        publicKey: ecdh.PublicKey.fromBuffer(curve, await tools.hexToBuffer(client_public_key))
    };
    const gingaSharedSecret = gingaKeys.privateKey.deriveSharedSecret(clientKeys.publicKey);

    return parseInt(gingaSharedSecret.toString('hex'), 16) % 10000;
}

async function displayPinCode(displayName, pincode){
    kodi.prototype
        .pin(displayName, pincode)
        .then(async () => {

        }).catch(e => function (e){
        console.error(e)
    });
}
/** fim: funções auxiliares **/


app.get("/dtv/authorize", async function (req, res) {
    const query = req.query;
    const firstAccess = await isFirstAccess(query['appid']); //verifica se é a primeira vez que o cliente acessa o app
    const challenge = await getChallenge(query['key']); //gera o challenge

    if (firstAccess) {
        kodi.prototype
            .authorization(query['display-name'], query['appid']) //exibe o popup de autorização
            .then(async () => {
                const newApplication = {
                    application_id: query['appid'],
                    application_name: query['display-name'],
                    is_authorized: false,
                    is_paired: false
                }
                await db.insertApplication(newApplication);

                await tools.sleep(20000); //aguarda por 20s a resposta do cliente

                const isAuthorized = await isApplicationAuthorized(query['appid']); //verifica a resposta da autorização

                if (isAuthorized) {
                    let pincode = parseInt(challenge, 16) % 10000;
                    await displayPinCode(query['display-name'], pincode); //exibe o pincode na tela

                    res.status(201).send({
                        firstAccess: true,
                        challenge: challenge,
                        key: GINGA_PUBLIC_KEY
                    });
                } else {
                    res.status(201).send({
                        firstAccess: true,
                        challenge: challenge,
                        key: GINGA_PUBLIC_KEY
                    });
                }
            }).catch(e =>
                res.status(103).send({
                    error: e
                })
            );
    } else {
        const isPaired = await isApplicationPaired(query['appid']); //verifica se a aplicação já está pareada atraves do pin code
        if (!isPaired) {
            let pincode = await generatePinCode(query['key']);//caso não esteja, gera o pincode e o exibe na tela
            displayPinCode(query['display-name'], pincode);

            res.status(201).send({
                firstAccess: true,
                challenge: challenge,
                key: GINGA_PUBLIC_KEY
            });
        } else {
            res.status(201).send({
                firstAccess: false,
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
    await db.updateApplication(updateApplication);

    kodi.prototype
        .closePinWindow()
        .then(async () => {

        }).catch(e => function (e){
        console.error(e)
    });

    const application = await db.selectApplication(query['appid']);
    const isApplicationExists = (application.length === 0);

    if(isApplicationExists){
        res.status(101).end();
    } else {
        const client = {
            appid: application[0].application_id,
            application_name: application[0].application_name
        };

        const accessToken = createAccessToken();
        const refreshToken = createRefreshToken(client);

        res.status(201).send({
            accessToken: accessToken,
            tokenType: 'Bearer',
            expiresIn: config.tokenLife,
            refreshToken: refreshToken,
            serverCert: ''
        });
    }
});