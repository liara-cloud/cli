import ora from 'ora'
import axios from 'axios'
import chalk from 'chalk'
import moment from 'moment'
import getPort from 'get-port'
import inquirer from 'inquirer'
import { spawn, SpawnOptions } from 'child_process'

import Command from '../../base'
import { option } from '@oclif/command/lib/flags'

interface IVolume {
  name: string
}

export default class SftpOpen extends Command {
  static description = 'open sftp'
  
  static flags = Command.flags

  spinner!: ora.Ora

  async run() {
    const {flags} = this.parse(SftpOpen)
    this.spinner = ora()

    this.setAxiosToken({
      ...this.readGlobalConfig(),
      ...flags,
    })

    this.spinner.start('Loading...')
    const { data: { volumes } } = await axios.get<{ volumes: IVolume[] }>(`/v1/volumes`, this.axiosConfig)
    this.spinner.stop()

    const {volumeName} = await inquirer.prompt({
      name: 'volumeName',
      type: 'list',
      message: 'Please select a volume:',
      pageSize: Math.min(volumes.length, 10),
      choices: volumes.map((volume, index) => ({
        value: volume.name,
        name: `${index + 1}) ${volume.name}`,
        short: `${index + 1} ${volume.name}`
      })),
    }) as {volumeName: string}
    
    const { data: { token } } = await axios.post<{ token: string }>(`/v1/sftp/${volumeName}`,null , this.axiosConfig)
    
    const dstHost = '127.0.0.1';//TODO
    const dstPort = '1234';
    const localPort = String(await getPort({ host: '127.0.0.1', port: getPort.makeRange(30000, 31000) }));
    const pidFolder = '.liara-sftp'
    const options: SpawnOptions = flags.debug ? {} : {
      stdio: 'ignore',
      detached: true,
    };

    const subprocess = spawn(process.argv[0], [
      __dirname + '/../../../bin/tunnel.js',
      dstHost,
      dstPort,
      '2220',//TODO
      localPort,
      volumeName,
      token,
      pidFolder,
    ], options);

    !flags.debug && subprocess.unref();

    if(flags.debug) {
      subprocess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });
  
      subprocess.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });
  
      subprocess.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
      });
    }
    this.log(`SFTP is listening at ${chalk.bold('127.0.0.1:')}${chalk.green(localPort)} for ${volumeName}...`);
  }
}