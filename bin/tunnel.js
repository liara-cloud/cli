const tunnel = require('tunnel-ssh');
const npid = require('npid');
const os = require('os');
const fs = require('fs');

const [_, __, dstHost, dstPort, sshPort, localPort, username, password, pidFolder] = process.argv;

const baseDir = `${os.homedir()}/${pidFolder}`;

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
  username: username,
  password: password,
  host: dstHost,
  port: Number(sshPort),
  dstHost: dstHost,
  dstPort: Number(dstPort),
  localHost: '127.0.0.1',
  localPort: Number(localPort),
  keepAlive: true,
};

tunnel(config, function (error) {
  if(error) {
    return console.error('ERROR:', error);
  }
  console.log('Tunnel has been established.');
})
.on('connection', function(info) {
  console.log('New Connection...');
})
.on('error', function(error) {
  console.error('FAILED:', error)
});
