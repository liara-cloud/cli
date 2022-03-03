import chalk from 'chalk'
import axios from 'axios'
import fs from 'fs-extra'
import retry from 'async-retry'
import {prompt} from 'inquirer'
import {Flags} from '@oclif/core'
import promptEmail from 'email-prompt-ts'
import {validate as validateEmail} from 'email-validator'

import Command from '../base'
import eraseLines from '../utils/erase-lines'
import {createDebugLogger} from '../utils/output'
import {GLOBAL_CONF_PATH, REGIONS_API_URL} from '../constants'

export default class Login extends Command {
  static description = 'login to your account'

  static flags = {
    ...Command.flags,
    email: Flags.string({char: 'e', description: 'your email'}),
    password: Flags.string({char: 'p', description: 'your password'}),
  }

  async run() {
    const {flags} = await this.parse(Login)
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
    this.axiosConfig.headers.Authorization = `Bearer ${flags['api-token']}`

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

    if (!flags.password && !flags['api-token']) {
      body.password = await this.promptPassword()
    }

    const {api_token, fullname, avatar} = await retry(async () => {
      try {
        if (flags['api-token']) {
          const {data: {user}} = await axios.get('/v1/me', this.axiosConfig)
          user.api_token = flags['api-token']
          return user
        }
        const {data} = await axios.post('/v1/login', body, this.axiosConfig)
        return data
      } catch (err) {
        debug('retrying...')
        throw err
      }
    }, {retries: 3})

    const liara_json = this.readGlobalConfig();
    const name = `${body.email}_${region}`

    fs.writeFileSync(GLOBAL_CONF_PATH, JSON.stringify({
      api_token,
      region,
      fullname,
      avatar,
      current: null,
      accounts: liara_json.accounts,
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
