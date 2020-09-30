import chalk from 'chalk'
import axios from 'axios'
import fs from 'fs-extra'
import retry from 'async-retry'
import {prompt} from 'inquirer'
import promptEmail from 'email-prompt-ts'
import {flags} from '@oclif/command'
import {validate as validateEmail} from 'email-validator'

import Command from '../base'
import eraseLines from '../utils/erase-lines'
import {createDebugLogger} from '../utils/output'
import {GLOBAL_CONF_PATH, REGIONS_API_URL} from '../constants'

export default class Login extends Command {
  static description = 'login to your account'

  static flags = {
    ...Command.flags,
    email: flags.string({char: 'e', description: 'your email'}),
    password: flags.string({char: 'p', description: 'your password'}),
  }

  async run() {
    const {flags} = this.parse(Login)
    const debug = createDebugLogger(flags.debug)
    let region = flags.region;

    const body = {email: flags.email, password: flags.password}

    if (!region) {
      const {selectedRegion} = await prompt({
        name: 'selectedRegion',
        type: 'list',
        message: 'Please select a region:',
        choices: [
          "iran",
          "germany",
        ]
      }) as {selectedRegion: string}

      region = selectedRegion
    } else {
      this.log(`You're logging into "${region}" region:`);
    }

    this.axiosConfig.baseURL = REGIONS_API_URL[region]

    if (!flags.email) {
      let emailIsValid = false

      do {
        body.email = await this.promptEmail()

        emailIsValid = validateEmail(body.email)
        if (!emailIsValid) {
          // let's erase the `> Enter email [...]`
          // we can't use `console.log()` because it appends a `\n`
          // we need this check because `email-prompt` doesn't print
          // anything if there's no TTY
          process.stdout.write(eraseLines(1))
        }
      } while (!emailIsValid)

      this.log()
    }

    if (!flags.password) {
      body.password = await this.promptPassword()
    }

    const {api_token} = await retry(async () => {
      try {
        const {data} = await axios.post('/v1/login', body, this.axiosConfig)
        return data
      } catch (err) {
        debug('retrying...')
        throw err
      }
    }, {retries: 3})

    fs.writeFileSync(GLOBAL_CONF_PATH, JSON.stringify({
      api_token,
      region,
    }))

    this.log(`> Auth credentials saved in ${chalk.bold(GLOBAL_CONF_PATH)}`)
    this.log(chalk.green('You have logged in successfully.'))
  }

  async promptEmail(): Promise<string> {
    try {
      return await promptEmail({start: `${chalk.green('?')} ${chalk.bold('Enter your email:')} `})
    } catch (err) {
      this.log() // \n

      if (err.message === 'User abort') {
        process.stdout.write(eraseLines(2))
        // tslint:disable-next-line: no-console
        console.log(`${chalk.red('> Aborted!')} No changes made.`)
        process.exit(0)
      }

      if (err.message === 'stdin lacks setRawMode support') {
        this.error(
          `Interactive mode not supported – please run ${chalk.green(
            'liara login --email you@domain.com --password your_password'
          )}`
        )
      }

      throw err
    }
  }

  async promptPassword(): Promise<string> {
    const {password} = await prompt({
      name: 'password',
      type: 'password',
      message: 'Enter your password:',
      validate(input) {
        if (input.length === 0) {
          return false
        }
        return true
      }
    }) as {password: string}

    return password
  }
}
