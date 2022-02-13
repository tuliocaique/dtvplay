const {Server: SSDPServer} = require("node-ssdp");
const ip = require("ip");
const port = process.env.PORT || 8081;

class ssdpServer {
    async start() {
        const SSDP_ST = "urn:schemas-sbtvd-org:service:GingaCCWebServices:1"
        const server = new SSDPServer({
            location: "http://" + ip.address() + ":" + port + "/location",
            suppressRootDeviceAdvertisements: true,
            reuseAddr: true,
            adInterval: 1000000 // hight notify interval because m-search response is more important
        });
        server.addUSN(SSDP_ST);
        server.start()
            .catch(e => {
                console.log("-- Failed to start GingaCC-Server SSDP:", e);
            })
            .then(() => {
                console.log("-- GingaCC-Server SSDP started.");
            })

        process.on('exit', function () {
            server.stop() // advertise shutting down and stop listening
        })
    }
}
module.exports = ssdpServer;