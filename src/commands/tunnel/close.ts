import os from 'os'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

import Command from '../../base'

const baseDir = `${os.homedir()}/.liara-tunnels`;

export default class TunnelClose extends Command {
  static description = 'close all open ssh tunnels'

  static flags = Command.flags

  async run() {
    fs.readdirSync(baseDir).forEach(file => {
      const pidPath = baseDir + '/' + file;
      const pid = Number(fs.readFileSync(pidPath).toString().replace('\n', ''));
      this.log(`Killing ${chalk.bold(`127.0.0.1:`)}${chalk.green(path.basename(file, '.pid'))} ...`)

      try {
        process.kill(pid);
      } catch (error) {
        // Ignore
      }

      try {
        fs.unlinkSync(pidPath);
      } catch (error) {
        // Ignore
      }
    });
  }
}
