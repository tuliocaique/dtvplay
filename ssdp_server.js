// documentação: https://github.com/diversario/node-ssdp

const Server = require('node-ssdp').Server;

const opts = {
    location: {
        protocol: 'http://',
        port: 8087,
        path: '/device-desc.xml',
    }
};

const server = new Server(opts);


server.addUSN('urn:schemas-sbtvd-org:service:GingaCCWebServices:1');

server.on('advertise-alive', function (headers) {
    console.log('====== advertise-alive ======');
    console.log(headers);
});

server.on('advertise-bye', function (headers) {
    console.log('====== advertise-bye ======');
    console.log(headers);
});

server.start();

console.log(server);
process.on('exit', function(){
    server.stop();
})