@liara/cli
==========

The command line interface for Liara

[![Version](https://img.shields.io/npm/v/@liara/cli.svg)](https://npmjs.org/package/@liara/cli)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/liara-ir/liara-cli?branch=master&svg=true)](https://ci.appveyor.com/project/liara-ir/liara-cli/branch/master)
[![Downloads/week](https://img.shields.io/npm/dw/@liara/cli.svg)](https://npmjs.org/package/@liara/cli)
[![License](https://img.shields.io/npm/l/@liara/cli.svg)](https://github.com/liara-ir/liara-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @liara/cli
$ liara COMMAND
running command...
$ liara (-v|--version|version)
@liara/cli/1.0.3 linux-x64 node-v10.15.1
$ liara --help [COMMAND]
USAGE
  $ liara COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`liara deploy`](#liara-deploy)
* [`liara help [COMMAND]`](#liara-help-command)
* [`liara login`](#liara-login)
* [`liara logs`](#liara-logs)

## `liara deploy`

deploy a project

```
USAGE
  $ liara deploy

OPTIONS
  -d, --debug            show debug logs
  -h, --help             show CLI help
  -i, --image=image      docker image to deploy
  -p, --project=project  project id
  -v, --volume=volume    volume absolute path
  --api-token=api-token  your api token to use for authentication
  --no-project-logs      do not stream project logs after deployment
  --path=path            project path in your computer
  --platform=platform    the platform your project needs to run
  --port=port            the port that your app listens to
```

_See code: [src/commands/deploy.ts](https://github.com/liara-ir/liara-cli/blob/v1.0.3/src/commands/deploy.ts)_

## `liara help [COMMAND]`

display help for liara

```
USAGE
  $ liara help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.6/src/commands/help.ts)_

## `liara login`

login to your account

```
USAGE
  $ liara login

OPTIONS
  -d, --debug              show debug logs
  -e, --email=email        your email
  -h, --help               show CLI help
  -p, --password=password  your password
  --api-token=api-token    your api token to use for authentication
```

_See code: [src/commands/login.ts](https://github.com/liara-ir/liara-cli/blob/v1.0.3/src/commands/login.ts)_

## `liara logs`

see a project's logs

```
USAGE
  $ liara logs

OPTIONS
  -d, --debug            show debug logs
  -h, --help             show CLI help
  -p, --project=project  (required) project id
  -s, --since=since      show logs since timestamp
  --api-token=api-token  your api token to use for authentication
```

_See code: [src/commands/logs.ts](https://github.com/liara-ir/liara-cli/blob/v1.0.3/src/commands/logs.ts)_
<!-- commandsstop -->
