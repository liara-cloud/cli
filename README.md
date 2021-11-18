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
@liara/cli/2.14.0 linux-x64 node-v16.13.0
$ liara --help [COMMAND]
USAGE
  $ liara COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`liara account:add`](#liara-accountadd)
* [`liara account:list`](#liara-accountlist)
* [`liara account:remove`](#liara-accountremove)
* [`liara account:use`](#liara-accountuse)
* [`liara app:create`](#liara-appcreate)
* [`liara app:delete`](#liara-appdelete)
* [`liara app:list`](#liara-applist)
* [`liara app:logs`](#liara-applogs)
* [`liara app:restart`](#liara-apprestart)
* [`liara app:shell`](#liara-appshell)
* [`liara app:start`](#liara-appstart)
* [`liara app:stop`](#liara-appstop)
* [`liara deploy`](#liara-deploy)
* [`liara disk:create`](#liara-diskcreate)
* [`liara help [COMMAND]`](#liara-help-command)
* [`liara login`](#liara-login)
* [`liara plan:list`](#liara-planlist)

## `liara account:add`

add an account

```
add an account

USAGE
  $ liara account:add

OPTIONS
  -a, --account=account    account name
  -e, --email=email        your email
  -h, --help               show CLI help
  -p, --password=password  your password
  --api-token=api-token    your api token to use for authentication
  --debug                  show debug logs
  --region=iran|germany    the region you want to deploy your app to
```

_See code: [src/commands/account/add.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/account/add.ts)_

## `liara account:list`

list available accounts

```
list available accounts

USAGE
  $ liara account:list

OPTIONS
  -h, --help              show CLI help
  -x, --extended          show extra columns
  --api-token=api-token   your api token to use for authentication
  --columns=columns       only show provided columns (comma-separated)
  --csv                   output is csv format [alias: --output=csv]
  --debug                 show debug logs
  --filter=filter         filter property by partial string matching, ex: name=foo
  --no-header             hide table header from output
  --no-truncate           do not truncate output to fit screen
  --output=csv|json|yaml  output in a more machine friendly format
  --region=iran|germany   the region you want to deploy your app to
  --sort=sort             property to sort by (prepend '-' for descending)

ALIASES
  $ liara account:ls
```

_See code: [src/commands/account/list.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/account/list.ts)_

## `liara account:remove`

remove an account

```
remove an account

USAGE
  $ liara account:remove

OPTIONS
  -a, --account=account  account name
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --debug                show debug logs
  --region=iran|germany  the region you want to deploy your app to

ALIASES
  $ liara account:rm
```

_See code: [src/commands/account/remove.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/account/remove.ts)_

## `liara account:use`

select an account

```
select an account

USAGE
  $ liara account:use

OPTIONS
  -a, --account=account  account name
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --debug                show debug logs
  --region=iran|germany  the region you want to deploy your app to
```

_See code: [src/commands/account/use.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/account/use.ts)_

## `liara app:create`

create an app

```
create an app

USAGE
  $ liara app:create

OPTIONS
  -a, --app=app          (required) app id
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --debug                show debug logs
  --plan=plan            plan
  --platform=platform    platform
  --region=iran|germany  the region you want to deploy your app to

ALIASES
  $ liara create
```

_See code: [src/commands/app/create.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/app/create.ts)_

## `liara app:delete`

delete an app

```
delete an app

USAGE
  $ liara app:delete

OPTIONS
  -a, --app=app          (required) app id
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --debug                show debug logs
  --region=iran|germany  the region you want to deploy your app to

ALIASES
  $ liara delete
```

_See code: [src/commands/app/delete.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/app/delete.ts)_

## `liara app:list`

list available apps

```
list available apps

USAGE
  $ liara app:list

OPTIONS
  -h, --help              show CLI help
  -x, --extended          show extra columns
  --api-token=api-token   your api token to use for authentication
  --columns=columns       only show provided columns (comma-separated)
  --csv                   output is csv format [alias: --output=csv]
  --debug                 show debug logs
  --filter=filter         filter property by partial string matching, ex: name=foo
  --no-header             hide table header from output
  --no-truncate           do not truncate output to fit screen
  --output=csv|json|yaml  output in a more machine friendly format
  --region=iran|germany   the region you want to deploy your app to
  --sort=sort             property to sort by (prepend '-' for descending)

ALIASES
  $ liara app:ls
```

_See code: [src/commands/app/list.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/app/list.ts)_

## `liara app:logs`

fetch the logs of an app

```
fetch the logs of an app

USAGE
  $ liara app:logs

OPTIONS
  -a, --app=app          (required) app id
  -h, --help             show CLI help
  -s, --since=since      show logs since timestamp
  --api-token=api-token  your api token to use for authentication
  --debug                show debug logs
  --region=iran|germany  the region you want to deploy your app to

ALIASES
  $ liara logs
```

_See code: [src/commands/app/logs.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/app/logs.ts)_

## `liara app:restart`

restart an app

```
restart an app

USAGE
  $ liara app:restart

OPTIONS
  -a, --app=app          (required) app id
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --debug                show debug logs
  --region=iran|germany  the region you want to deploy your app to

ALIASES
  $ liara restart
```

_See code: [src/commands/app/restart.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/app/restart.ts)_

## `liara app:shell`

run a command in a running applet

```
run a command in a running applet

USAGE
  $ liara app:shell

OPTIONS
  -a, --app=app          app id
  -c, --command=command  [default: /bin/bash] the command to execute
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --debug                show debug logs
  --region=iran|germany  the region you want to deploy your app to

ALIASES
  $ liara shell
```

_See code: [src/commands/app/shell.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/app/shell.ts)_

## `liara app:start`

start an app

```
start an app

USAGE
  $ liara app:start

OPTIONS
  -a, --app=app          (required) app id
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --debug                show debug logs
  --region=iran|germany  the region you want to deploy your app to

ALIASES
  $ liara start
```

_See code: [src/commands/app/start.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/app/start.ts)_

## `liara app:stop`

stop an app

```
stop an app

USAGE
  $ liara app:stop

OPTIONS
  -a, --app=app          (required) app id
  -h, --help             show CLI help
  --api-token=api-token  your api token to use for authentication
  --debug                show debug logs
  --region=iran|germany  the region you want to deploy your app to

ALIASES
  $ liara stop
```

_See code: [src/commands/app/stop.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/app/stop.ts)_

## `liara deploy`

deploy an app

```
deploy an app

USAGE
  $ liara deploy

OPTIONS
  -a, --app=app          app id
  -d, --disks=disks      mount a disk
  -h, --help             show CLI help
  -i, --image=image      docker image to deploy
  -m, --message=message  the release message
  -v, --volume=volume    volume absolute path
  --api-token=api-token  your api token to use for authentication
  --args=args            docker image entrypoint args
  --build-arg=build-arg  docker image build args
  --debug                show debug logs
  --detach               do not stream app logs after deployment
  --path=path            app path in your computer
  --platform=platform    the platform your app needs to run
  --port=port            the port that your app listens to
  --region=iran|germany  the region you want to deploy your app to
```

_See code: [src/commands/deploy.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/deploy.ts)_

## `liara disk:create`

create a disk

```
create a disk

USAGE
  $ liara disk:create

OPTIONS
  -a, --app=app          app id
  -d, --disk=disk        disk id
  -h, --help             show CLI help
  -s, --size=size        disk size
  --api-token=api-token  your api token to use for authentication
  --debug                show debug logs
  --region=iran|germany  the region you want to deploy your app to
```

_See code: [src/commands/disk/create.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/disk/create.ts)_

## `liara help [COMMAND]`

display help for liara

```
display help for <%= config.bin %>

USAGE
  $ liara help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `liara login`

login to your account

```
login to your account

USAGE
  $ liara login

OPTIONS
  -e, --email=email        your email
  -h, --help               show CLI help
  -p, --password=password  your password
  --api-token=api-token    your api token to use for authentication
  --debug                  show debug logs
  --region=iran|germany    the region you want to deploy your app to
```

_See code: [src/commands/login.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/login.ts)_

## `liara plan:list`

list available plans

```
list available plans

USAGE
  $ liara plan:list

OPTIONS
  -h, --help              show CLI help
  -x, --extended          show extra columns
  --api-token=api-token   your api token to use for authentication
  --columns=columns       only show provided columns (comma-separated)
  --csv                   output is csv format [alias: --output=csv]
  --debug                 show debug logs
  --filter=filter         filter property by partial string matching, ex: name=foo
  --no-header             hide table header from output
  --no-truncate           do not truncate output to fit screen
  --output=csv|json|yaml  output in a more machine friendly format
  --region=iran|germany   the region you want to deploy your app to
  --sort=sort             property to sort by (prepend '-' for descending)

ALIASES
  $ liara plan:ls
```

_See code: [src/commands/plan/list.ts](https://github.com/liara-ir/liara-cli/blob/v2.14.0/src/commands/plan/list.ts)_
<!-- commandsstop -->
