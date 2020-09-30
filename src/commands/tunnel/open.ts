import ora from 'ora'
import axios from 'axios'
import chalk from 'chalk'
import moment from 'moment'
import getPort from 'get-port'
import inquirer from 'inquirer'
import { spawn, SpawnOptions } from 'child_process'

import Command from '../../base'

interface DatabaseListItem {
  _id: string,
  name: string,
  type: string,
  status: string,
  planID: string,
  created_at: string,
}

interface Database {
  _id: string,
  name: string,
  type: string,
  version: string,
  planID: string,
  status: string,
  volumeSize: number,
  dailyBackups: boolean,
  dbName: string,
  metaData: any,
  node: { _id: string, host: string },
  port: number,
  root_password: string,
  username: string,
}

export default class TunnelOpen extends Command {
  static description = 'open a ssh tunnel'

  static flags = Command.flags
  
  spinner!: ora.Ora

  async run() {
    const {flags} = this.parse(TunnelOpen)
    this.spinner = ora()

    const config = {
      ...this.readGlobalConfig(),
      ...flags,
    }

    this.setAxiosConfig(config)

    if(config.region === 'iran') {
      this.error(`We don't support tunneling in "iran" region.
More info: https://docs.liara.ir/databases/tunnel`)
    }

    this.spinner.start('Loading...');

    const { data: { databases } } = await axios.get<{ databases: DatabaseListItem[] }>(`/v1/databases?status=RUNNING`, this.axiosConfig)

    this.spinner.stop();

    const {databaseID} = await inquirer.prompt({
      name: 'databaseID',
      type: 'list',
      message: 'Please select a database:',
      pageSize: Math.min(databases.length, 10),
      choices: databases.map((database, index) => ({
        value: database._id,
        name: `${index + 1}) [${chalk.green(database.status)}] ${chalk.bold(database.type)} ${chalk.gray(moment(database.created_at).fromNow())}`,
        short: `${index + 1}) ${database.type}`
      })),
    }) as {databaseID: string}

    const { data: { database } } = await axios.get<{ database: Database }>(`/v1/databases/${databaseID}`, this.axiosConfig)

    const dstHost = database.node.host;
    const dstPort = String(database.port);
    const localPort = String(await getPort({ host: '127.0.0.1', port: getPort.makeRange(30000, 31000) }));

    const options: SpawnOptions = flags.debug ? {} : {
      stdio: 'ignore',
      detached: true,
    };
    const subprocess = spawn(process.argv[0], [
      __dirname + '/../../../bin/tunnel.js',
      dstHost,
      dstPort,
      localPort,
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

    this.log(`Tunnel is listening at ${chalk.bold('127.0.0.1:')}${chalk.green(localPort)} for ${database.type}...`);
  }
}
