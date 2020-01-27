const tunnel = require('tunnel-ssh');
const npid = require('npid');
const os = require('os');
const fs = require('fs');

const [_, __, dstHost, dstPort, localPort] = process.argv;

const baseDir = `${os.homedir()}/.liara-tunnels`;

try {
  fs.mkdirSync(baseDir, { recursive: true });
  const pid = npid.create(`${baseDir}/${localPort}.pid`);
  pid.removeOnExit();
  process.on('SIGINT', function () {
    pid.remove();
    process.exit();
  });
} catch (error) {
  console.error('Creating PID file failed.');
  console.error(error);
}

const config = {
  username: 'liara-cli',
  password: '41bedf70-2cb9-4642-ba75-5ee29a799d48',
  host: dstHost,
  port: 2220,
  dstHost: dstHost,
  dstPort: dstPort,
  localHost: '127.0.0.1',
  localPort: localPort,
  keepAlive: true,
};

tunnel(config, function (error) {
  if(error) {
    return console.error('ERROR:', error);
  }
  console.log('Tunnel has been established.');
})
.on('connection', function(info) {
  console.log('New Connection:', info);
})
.on('error', function(error) {
  console.error('FAILED:', error)
});
