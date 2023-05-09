const   express           = require('express'),
        _               = require('lodash'),
        jwt             = require('express-jwt'),
        config          = require('../config.json'),
        kodi            = require('../kodi-controller');

let app = module.exports = express.Router();

/** inicio: jwt **/
let jwtCheck = jwt({
    secret: config.secret,
    audience: config.audience,
    issuer: config.issuer
});

let serviceList = [
    {
        "serviceContextId": "31.1.3",
        "serviceName": "Discovery Components",
        "transportStreamId": "1",
        "originalNetworkId": "1",
        "serviceId": "34"
    }
];

function findServiceList(serviceContextId) {
    for (const key in serviceList) {
        if (serviceList[key].serviceContextId === serviceContextId) {
            return serviceList[key];
        }
    }
    return [];
}

let componentService = [
    {
        "streamContent": "0x6",
        "componentType": "0x03",
        "componentTag": "0x1",
        "ISO639languageCode": "por",
        "pid": "123",
        "active": true,
        "pos": {"x": "100", "y":"100", "w":"100", "h":"100"},
        "vol": 100
    }
]

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


/**
 * 8.2.1 Obtenção do serviço DTV atual
**/
app.get('/dtv/current-service', async function(req, res) {
    const query = req.query;

    res.status(200).send(
        {
            "serviceContextId": "",
            "serviceName": "",
            "transportStreamId": "",
            "originalNetworkId": "",
            "serviceId": ""
        }
    );
});


/**
 * 8.2.2 Obtenção da lista dos serviços DTV disponíveis
**/
app.get('/dtv/service-list', async function(req, res) {
    res.status(200).send(
        {
            "serviceList": serviceList
        }
    );
});


/**
 * 8.2.3 Seleção de um serviço DTV
**/
app.post('/dtv/:serviceContextId', async function(req, res) {
    const query = req.body;
    const param  = req.params;

    let service = findServiceList(param.serviceContextId);

    res.status(200).send(
        {
            "serviceList": service
        }
    );
});


/**
 * 8.2.4 Obtenção da lista dos componentes do serviço DTV atual
**/
app.get('/dtv/current-service/components', async function(req, res) {
    res.status(200).send(
        {
            "components": componentService
        }
    );
});


/**
 * 8.2.5 Obtenção de informações de um componente do serviço DTV atual
**/
app.get('/dtv/current-service/:compTag', async function(req, res) {
    const query = req.body;
    res.status(200).send(componentService[0]);
});

/** 8.2.6 **/
app.post('/dtv/current-service/:compTag', async function(req, res) {
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

    componentService[0].vol = parseInt(query['vol']);
    res.status(200).send(componentService[0]);
});
