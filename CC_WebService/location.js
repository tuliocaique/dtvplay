const express = require('express')

let app = module.exports = express.Router();
const port = process.env.PORT || 44642;

app.get("/location", (req, res) => {
    const ip = require("ip");
    res.header("Ext", "");
    res.header("GingaCC-Server-BaseURL", "http://" + ip.address("Wi-Fi") + ":" + port + "/dtv/");
    res.header("GingaCC-Server-SecureBaseURL", "https://" + ip.address("Wi-Fi") + ":" + port + "/dtv/");
    res.header("GingaCC-Server-PairingMethods", "qcode,kex");
    res.header("GingaCC-Server-Manufacturer", "TeleMidia");
    res.header("GingaCC-Server-ModelName", "TeleMidia GingaCC-Server Mock");
    res.header("GingaCC-Server-FriendlyName", "TeleMidia Ginga Mock ");
    res.header("SERVER", "TeleMidia Ginga Mock");
    res.send();
});
