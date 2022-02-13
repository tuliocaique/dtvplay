const logger          = require('morgan'),
      cors            = require('cors'),
      http            = require('http'),
      express         = require('express'),
      errorhandler    = require('errorhandler'),
      dotenv          = require('dotenv'),
      bodyParser      = require('body-parser'),
      ssdpServer      = require('../ssdp-server.js');

const app = express();

dotenv.load();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.use(function(err, req, res, next) {
  if (errname === 'StatusError') {
    res.send(err.status, err.message);
  } else {
    next(err);
  }
});

if (process.env.NODE_ENV === 'development') {
  app.use(logger('dev'));
  app.use(errorhandler())
}

app.use(require('./media-controller'));
app.use(require('./authorization'));
app.use(require('./utils'));
app.use(require('./location'));

const port = process.env.PORT || 8081;

http.createServer(app).listen(port, function (err) {
  console.log('listening in http://localhost:' + port);
  ssdpServer.prototype.start().then(r => {
    console.log('SSDP server started');
  });
});
