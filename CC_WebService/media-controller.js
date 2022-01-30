const express           = require('express'),
        _               = require('lodash'),
        crypto          = require('crypto'),
        ecdh            = require('ecdh'),
        jwt             = require('express-jwt'),
        bodyParser      = require('body-parser'),
        config          = require('../config.json'),
        tools           = require('../tools'),
        kodi            = require('../kodi-controller'),
        db              = require("../db");

let app = module.exports = express.Router();

/** inicio: jwt **/
let jwtCheck = jwt({
    secret: config.secret,
    audience: config.audience,
    issuer: config.issuer
});

function requireScope(scope) {
    return function (req, res, next) {
        var has_scopes = req.user.scope === scope;
        if (!has_scopes) {
            res.sendStatus(401);
            return;
        }
        next();
    };
}
/** fim: jwt **/

//app.use('/dtv/current-service', jwtCheck, requireScope('full_access'));
app.use(express.json());
//app.use(express.urlencoded());

app.post('/dtv/current-service', async function(req, res) {
    const query = req.body;

    if (query['action'] === 'play' || query['action'] === 'pause') {
        const isPaused = await kodi.prototype.isPaused();
        if (isPaused && query['action'] === 'play' || !isPaused && query['action'] === 'pause')
            await kodi.prototype.setPlayPause(); //dá pausa/play na midia
    } else if (query['action'] === 'stop')
        await kodi.prototype.setStop(); //dá stop na midia

    const vol = await kodi.prototype.getVolume(); // pega o volume atual da reprodução

    if(vol.volume !== parseInt(query['vol']))
        await kodi.prototype.setVolume(parseInt(query['vol'])); //altera o volume

    res.status(200).send(
        {
            "streamContent": parseInt(query['vol']),
            "componentType": vol.volume,
            "componentTag": "",
            "ISO639languageCode": "",
            "pid": "",
            "active": "",
            "pos": "",
            "vol": ""
        }
    );
});
