const {Server: SSDPServer} = require("node-ssdp");
const ip = require("ip");
const port = process.env.PORT || 44642;

class ssdpServer {
    async start() {
        const SSDP_ST = "urn:schemas-sbtvd-org:service:GingaCCWebServices:1"
        const server = new SSDPServer({
            location: "http://" + ip.address("Wi-Fi") + ":" + port + "/location",
            suppressRootDeviceAdvertisements: true,
            reuseAddr: true,
            adInterval: 1000000
        });
        server.addUSN(SSDP_ST);
        server.start()
            .catch(e => {
                console.log(">> GingaCC-Server: Não foi possível iniciar o SSDP", e);
            })
            .then(() => {
                console.log(">> GingaCC-Server: SSDP iniciou");
            })

        process.on('exit', function () {
            server.stop();
            console.log(">> GingaCC-Server: SSDP finalizou");
        })
    }
}
module.exports = ssdpServer;