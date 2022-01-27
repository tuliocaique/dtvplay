const express   = require('express'),
        _       = require('lodash');

const db = require("../db");

const app = module.exports = express.Router();

app.post("/kodi", async function (req, res) {
    const data = req.body;

    let response = {
        success: true,
    }
    switch (data.action){
        case 'authorizationAnswer':
            const application = {
                application_id : data.application_id,
                is_authorized : (data.is_authorized === 'True' ? 1 : 0),
            }
            await db.updateApplication(application);
            break;
    }

    res.status(201).send({
        response
    });
});