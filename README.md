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
@liara/cli/2.10.1 darwin-x64 node-v14.17.3
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
* [`liara restart [APP]`](#liara-restart-app)
* [`liara shell`](#liara-shell)
* [`liara start [APP]`](#liara-start-app)
* [`liara stop [APP]`](#liara-stop-app)

## `liara deploy`

deploy an app

```
USAGE
  $ liara deploy

OPTIONS
  -a, --app=app          app id
  -d, --debug            show debug logs
  -h, --help             show CLI help
  -i, --image=image      docker image to deploy
  -m, --message=message  the release message
  -v, --volume=volume    volume absolute path
  --api-token=api-token  your api token to use for authentication
  --args=args            docker image entrypoint args
  --build-arg=build-arg  docker image build args
  --detach               do not stream app logs after deployment
  --path=path            app path in your computer
  --platform=platform    the platform your app needs to run
  --port=port            the port that your app listens to
  --region=iran|germany  the region you want to deploy your app to
```

_See code: [src/commands/deploy.ts](https://github.com/liara-ir/liara-cli/blob/v2.10.1/src/commands/deploy.ts)_

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
  --region=iran|germany    the region you want to deploy your app to
```

_See code: [src/commands/login.ts](https://github.com/liara-ir/liara-cli/blob/v2.10.1/src/commands/login.ts)_

## `liara logs`

Fetch the logs of an app

```
USAGE
  $ liara logs

OPTIONS
  -a, --app=app          (required) app id
  -d, --debug            show debug logs
  -h, --help             show CLI help
  -s, --since=since      show logs since timestamp
  --api-token=api-token  your api token to use for authentication
  --region=iran|germany  the region you want to deploy your app to
```

_See code: [src/commands/logs.ts](https://github.com/liara-ir/liara-cli/blob/v2.10.1/src/commands/logs.ts)_

## `liara restart [APP]`

restart an app

```
USAGE
  $ liara restart [APP]

OPTIONS
  -d, --debug            show debug logs
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --region=iran|germany  the region you want to deploy your app to
```

_See code: [src/commands/restart.ts](https://github.com/liara-ir/liara-cli/blob/v2.10.1/src/commands/restart.ts)_

## `liara shell`

Run a command in a running applet

```
USAGE
  $ liara shell

OPTIONS
  -a, --app=app          app id
  -c, --command=command  [default: /bin/bash] the command to execute
  -d, --debug            show debug logs
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --region=iran|germany  the region you want to deploy your app to
```

_See code: [src/commands/shell.ts](https://github.com/liara-ir/liara-cli/blob/v2.10.1/src/commands/shell.ts)_

## `liara start [APP]`

start an app

```
USAGE
  $ liara start [APP]

OPTIONS
  -d, --debug            show debug logs
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --region=iran|germany  the region you want to deploy your app to
```

_See code: [src/commands/start.ts](https://github.com/liara-ir/liara-cli/blob/v2.10.1/src/commands/start.ts)_

## `liara stop [APP]`

stop an app

```
USAGE
  $ liara stop [APP]

OPTIONS
  -d, --debug            show debug logs
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --region=iran|germany  the region you want to deploy your app to
```

_See code: [src/commands/stop.ts](https://github.com/liara-ir/liara-cli/blob/v2.10.1/src/commands/stop.ts)_
<!-- commandsstop -->
