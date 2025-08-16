# @liara/cli

The command line interface for Liara

[![Version](https://img.shields.io/npm/v/@liara/cli.svg)](https://npmjs.org/package/@liara/cli)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/liara-ir/liara-cli?branch=master&svg=true)](https://ci.appveyor.com/project/liara-ir/liara-cli/branch/master)
[![Downloads/week](https://img.shields.io/npm/dw/@liara/cli.svg)](https://npmjs.org/package/@liara/cli)
[![License](https://img.shields.io/npm/l/@liara/cli.svg)](https://github.com/liara-ir/liara-cli/blob/master/package.json)

<!-- toc -->
* [@liara/cli](#liaracli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @liara/cli
$ liara COMMAND
running command...
$ liara (--version|-v)
@liara/cli/9.3.2-beta.1 linux-x64 node-v20.12.0
$ liara --help [COMMAND]
USAGE
  $ liara COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`liara account add`](#liara-account-add)
* [`liara account list`](#liara-account-list)
* [`liara account ls`](#liara-account-ls)
* [`liara account remove`](#liara-account-remove)
* [`liara account rm`](#liara-account-rm)
* [`liara account use`](#liara-account-use)
* [`liara app create`](#liara-app-create)
* [`liara app delete`](#liara-app-delete)
* [`liara app list`](#liara-app-list)
* [`liara app logs`](#liara-app-logs)
* [`liara app ls`](#liara-app-ls)
* [`liara app remove`](#liara-app-remove)
* [`liara app restart`](#liara-app-restart)
* [`liara app rm`](#liara-app-rm)
* [`liara app shell`](#liara-app-shell)
* [`liara app start`](#liara-app-start)
* [`liara app stop`](#liara-app-stop)
* [`liara autocomplete [SHELL]`](#liara-autocomplete-shell)
* [`liara bucket create`](#liara-bucket-create)
* [`liara bucket delete`](#liara-bucket-delete)
* [`liara bucket list`](#liara-bucket-list)
* [`liara bucket ls`](#liara-bucket-ls)
* [`liara create`](#liara-create)
* [`liara db backup create`](#liara-db-backup-create)
* [`liara db backup dl`](#liara-db-backup-dl)
* [`liara db backup download`](#liara-db-backup-download)
* [`liara db backup list`](#liara-db-backup-list)
* [`liara db backup ls`](#liara-db-backup-ls)
* [`liara db create`](#liara-db-create)
* [`liara db list`](#liara-db-list)
* [`liara db ls`](#liara-db-ls)
* [`liara db remove`](#liara-db-remove)
* [`liara db resize`](#liara-db-resize)
* [`liara db rm`](#liara-db-rm)
* [`liara db start`](#liara-db-start)
* [`liara db stop`](#liara-db-stop)
* [`liara delete`](#liara-delete)
* [`liara deploy`](#liara-deploy)
* [`liara disk create`](#liara-disk-create)
* [`liara env list`](#liara-env-list)
* [`liara env ls`](#liara-env-ls)
* [`liara env set [ENV]`](#liara-env-set-env)
* [`liara env unset [ENV]`](#liara-env-unset-env)
* [`liara help [COMMAND]`](#liara-help-command)
* [`liara login`](#liara-login)
* [`liara logs`](#liara-logs)
* [`liara mail create`](#liara-mail-create)
* [`liara mail delete`](#liara-mail-delete)
* [`liara mail list`](#liara-mail-list)
* [`liara mail ls`](#liara-mail-ls)
* [`liara mail send`](#liara-mail-send)
* [`liara network create`](#liara-network-create)
* [`liara network list`](#liara-network-list)
* [`liara network ls`](#liara-network-ls)
* [`liara plan list`](#liara-plan-list)
* [`liara plan ls`](#liara-plan-ls)
* [`liara restart`](#liara-restart)
* [`liara shell`](#liara-shell)
* [`liara start`](#liara-start)
* [`liara stop`](#liara-stop)
* [`liara version`](#liara-version)
* [`liara zone ch`](#liara-zone-ch)
* [`liara zone check`](#liara-zone-check)
* [`liara zone create`](#liara-zone-create)
* [`liara zone del`](#liara-zone-del)
* [`liara zone delete`](#liara-zone-delete)
* [`liara zone get`](#liara-zone-get)
* [`liara zone list`](#liara-zone-list)
* [`liara zone ls`](#liara-zone-ls)
* [`liara zone record create ZONE`](#liara-zone-record-create-zone)
* [`liara zone record get`](#liara-zone-record-get)
* [`liara zone record list`](#liara-zone-record-list)
* [`liara zone record ls`](#liara-zone-record-ls)
* [`liara zone record remove`](#liara-zone-record-remove)
* [`liara zone record rm`](#liara-zone-record-rm)
* [`liara zone record update`](#liara-zone-record-update)
* [`liara zone rm`](#liara-zone-rm)

## `liara account add`

add an account

```
USAGE
  $ liara account add [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [-e <value>] [-p
    <value>]

FLAGS
  -a, --account=<value>    account name
  -e, --email=<value>      your email
  -h, --help               Show CLI help.
  -p, --password=<value>   your password
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  add an account
```

_See code: [src/commands/account/add.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/account/add.ts)_

## `liara account list`

list available accounts

```
USAGE
  $ liara account list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available accounts

ALIASES
  $ liara account ls
```

_See code: [src/commands/account/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/account/list.ts)_

## `liara account ls`

list available accounts

```
USAGE
  $ liara account ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available accounts

ALIASES
  $ liara account ls
```

## `liara account remove`

remove an account

```
USAGE
  $ liara account remove [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --account=<value>    account name
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  remove an account

ALIASES
  $ liara account rm
```

_See code: [src/commands/account/remove.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/account/remove.ts)_

## `liara account rm`

remove an account

```
USAGE
  $ liara account rm [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --account=<value>    account name
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  remove an account

ALIASES
  $ liara account rm
```

## `liara account use`

select an account

```
USAGE
  $ liara account use [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --account=<value>    account name
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  select an account
```

_See code: [src/commands/account/use.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/account/use.ts)_

## `liara app create`

create an app

```
USAGE
  $ liara app create [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>] [--platform <value>] [--plan <value>] [--feature-plan <value>] [-n <value>] [-r true|false]

FLAGS
  -a, --app=<value>           app id
  -h, --help                  Show CLI help.
  -n, --network=<value>       network
  -r, --read-only=<option>    read-only filesystem
                              <options: true|false>
      --account=<value>       temporarily switch to a different account
      --api-token=<value>     your api token to use for authentication
      --debug                 show debug logs
      --feature-plan=<value>  feature bundle plan
      --plan=<value>          plan
      --platform=<value>      platform
      --region=<option>       the region you want to deploy your app to
                              <options: iran|germany>

DESCRIPTION
  create an app

ALIASES
  $ liara create
```

_See code: [src/commands/app/create.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/app/create.ts)_

## `liara app delete`

delete an app

```
USAGE
  $ liara app delete [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  delete an app

ALIASES
  $ liara delete
  $ liara app remove
  $ liara app rm
```

_See code: [src/commands/app/delete.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/app/delete.ts)_

## `liara app list`

list available apps

```
USAGE
  $ liara app list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available apps

ALIASES
  $ liara app ls
```

_See code: [src/commands/app/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/app/list.ts)_

## `liara app logs`

fetch the logs of an app

```
USAGE
  $ liara app logs [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>] [-s <value>] [-t] [-f] [-c]

FLAGS
  -a, --app=<value>        app id
  -c, --colorize           colorize log output
  -f, --follow             follow log output
  -h, --help               Show CLI help.
  -s, --since=<value>      show logs since a specific time in the past (e.g. "1 hour ago")
  -t, --timestamps         show timestamps
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  fetch the logs of an app

ALIASES
  $ liara logs
```

_See code: [src/commands/app/logs.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/app/logs.ts)_

## `liara app ls`

list available apps

```
USAGE
  $ liara app ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available apps

ALIASES
  $ liara app ls
```

## `liara app remove`

delete an app

```
USAGE
  $ liara app remove [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  delete an app

ALIASES
  $ liara delete
  $ liara app remove
  $ liara app rm
```

## `liara app restart`

restart an app

```
USAGE
  $ liara app restart [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  restart an app

ALIASES
  $ liara restart
```

_See code: [src/commands/app/restart.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/app/restart.ts)_

## `liara app rm`

delete an app

```
USAGE
  $ liara app rm [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  delete an app

ALIASES
  $ liara delete
  $ liara app remove
  $ liara app rm
```

## `liara app shell`

run a command in a running applet

```
USAGE
  $ liara app shell [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>] [-c <value>]

FLAGS
  -a, --app=<value>        app id
  -c, --command=<value>    [default: /bin/bash] the command to execute
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  run a command in a running applet

ALIASES
  $ liara shell
```

_See code: [src/commands/app/shell.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/app/shell.ts)_

## `liara app start`

start an app

```
USAGE
  $ liara app start [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  start an app

ALIASES
  $ liara start
```

_See code: [src/commands/app/start.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/app/start.ts)_

## `liara app stop`

stop an app

```
USAGE
  $ liara app stop [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  stop an app

ALIASES
  $ liara stop
```

_See code: [src/commands/app/stop.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/app/stop.ts)_

## `liara autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ liara autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ liara autocomplete

  $ liara autocomplete bash

  $ liara autocomplete zsh

  $ liara autocomplete powershell

  $ liara autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.0.15/src/commands/autocomplete/index.ts)_

## `liara bucket create`

create a bucket

```
USAGE
  $ liara bucket create [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--name
    <value>] [--permission <value>] [--plan <value>]

FLAGS
  -h, --help                Show CLI help.
      --account=<value>     temporarily switch to a different account
      --api-token=<value>   your api token to use for authentication
      --debug               show debug logs
      --name=<value>        name
      --permission=<value>  permission
      --plan=<value>        plan
      --region=<option>     the region you want to deploy your app to
                            <options: iran|germany>

DESCRIPTION
  create a bucket

ALIASES
  $ liara bucket create
```

_See code: [src/commands/bucket/create.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/bucket/create.ts)_

## `liara bucket delete`

delete a bucket

```
USAGE
  $ liara bucket delete [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-b
    <value>] [-f]

FLAGS
  -b, --bucket=<value>     bucket name
  -f, --force              force the deletion
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  delete a bucket

ALIASES
  $ liara bucket delete
```

_See code: [src/commands/bucket/delete.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/bucket/delete.ts)_

## `liara bucket list`

list available buckets

```
USAGE
  $ liara bucket list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available buckets

ALIASES
  $ liara bucket ls
```

_See code: [src/commands/bucket/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/bucket/list.ts)_

## `liara bucket ls`

list available buckets

```
USAGE
  $ liara bucket ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available buckets

ALIASES
  $ liara bucket ls
```

## `liara create`

create an app

```
USAGE
  $ liara create [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>] [--platform <value>] [--plan <value>] [--feature-plan <value>] [-n <value>] [-r true|false]

FLAGS
  -a, --app=<value>           app id
  -h, --help                  Show CLI help.
  -n, --network=<value>       network
  -r, --read-only=<option>    read-only filesystem
                              <options: true|false>
      --account=<value>       temporarily switch to a different account
      --api-token=<value>     your api token to use for authentication
      --debug                 show debug logs
      --feature-plan=<value>  feature bundle plan
      --plan=<value>          plan
      --platform=<value>      platform
      --region=<option>       the region you want to deploy your app to
                              <options: iran|germany>

DESCRIPTION
  create an app

ALIASES
  $ liara create
```

## `liara db backup create`

create a database backup

```
USAGE
  $ liara db backup create [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your database
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  create a database backup
```

_See code: [src/commands/db/backup/create.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/db/backup/create.ts)_

## `liara db backup dl`

download a database backup

```
USAGE
  $ liara db backup dl [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>] [-b <value>] [-o <value>]

FLAGS
  -b, --backup=<value>     select which backup to download
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your database
  -o, --output=<value>     download the backup file and save it as the given name in the current working directory
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  download a database backup

ALIASES
  $ liara db backup dl
```

## `liara db backup download`

download a database backup

```
USAGE
  $ liara db backup download [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>] [-b <value>] [-o <value>]

FLAGS
  -b, --backup=<value>     select which backup to download
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your database
  -o, --output=<value>     download the backup file and save it as the given name in the current working directory
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  download a database backup

ALIASES
  $ liara db backup dl
```

_See code: [src/commands/db/backup/download.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/db/backup/download.ts)_

## `liara db backup list`

list backups for a database

```
USAGE
  $ liara db backup list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml
    |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your database
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list backups for a database

ALIASES
  $ liara db backup ls
```

_See code: [src/commands/db/backup/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/db/backup/list.ts)_

## `liara db backup ls`

list backups for a database

```
USAGE
  $ liara db backup ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml
    |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your database
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list backups for a database

ALIASES
  $ liara db backup ls
```

## `liara db create`

create a new database

```
USAGE
  $ liara db create [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>] [--plan <value>] [--public-network] [--feature-plan <value>] [-t <value>] [-v <value>] [-y] [--network
    <value>]

FLAGS
  -h, --help                  Show CLI help.
  -n, --name=<value>          name of your database
  -t, --type=<value>          choose which database to use
  -v, --version=<value>       version of the database
  -y, --yes                   say yes to continue prompt
      --account=<value>       temporarily switch to a different account
      --api-token=<value>     your api token to use for authentication
      --debug                 show debug logs
      --feature-plan=<value>  feature bundle plan
      --network=<value>       network
      --plan=<value>          plan
      --public-network        use public network or not
      --region=<option>       the region you want to deploy your app to
                              <options: iran|germany>

DESCRIPTION
  create a new database
```

_See code: [src/commands/db/create.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/db/create.ts)_

## `liara db list`

list available databases

```
USAGE
  $ liara db list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available databases

ALIASES
  $ liara db ls
```

_See code: [src/commands/db/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/db/list.ts)_

## `liara db ls`

list available databases

```
USAGE
  $ liara db ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available databases

ALIASES
  $ liara db ls
```

## `liara db remove`

remove a database

```
USAGE
  $ liara db remove [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>] [-y]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your database
  -y, --yes                say yes to continue prompt
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  remove a database

ALIASES
  $ liara db rm
```

_See code: [src/commands/db/remove.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/db/remove.ts)_

## `liara db resize`

resize a database

```
USAGE
  $ liara db resize [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>] [--plan <value>] [-d <value>]

FLAGS
  -d, --disk=<value>       extend disk size or not
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your database
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --plan=<value>       new plan name
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  resize a database
```

_See code: [src/commands/db/resize.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/db/resize.ts)_

## `liara db rm`

remove a database

```
USAGE
  $ liara db rm [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>] [-y]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your database
  -y, --yes                say yes to continue prompt
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  remove a database

ALIASES
  $ liara db rm
```

## `liara db start`

start a database

```
USAGE
  $ liara db start [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your database
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  start a database
```

_See code: [src/commands/db/start.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/db/start.ts)_

## `liara db stop`

stop a database

```
USAGE
  $ liara db stop [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your database
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  stop a database
```

_See code: [src/commands/db/stop.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/db/stop.ts)_

## `liara delete`

delete an app

```
USAGE
  $ liara delete [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  delete an app

ALIASES
  $ liara delete
  $ liara app remove
  $ liara app rm
```

## `liara deploy`

deploy an app

```
USAGE
  $ liara deploy [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--path
    <value>] [--platform <value>] [-a <value>] [-p <value>] [-i <value>] [--detach] [--no-app-logs] [--args <value>]
    [--build-arg <value>] [-m <value>] [-d <value>] [--no-cache] [-f <value>] [-b iran|germany]

FLAGS
  -a, --app=<value>              app id
  -b, --build-location=<option>  name of the build's location
                                 <options: iran|germany>
  -d, --disks=<value>...         mount a disk
  -f, --dockerfile=<value>       name of the Dockerfile (default is "PATH/Dockerfile")
  -h, --help                     Show CLI help.
  -i, --image=<value>            docker image to deploy
  -m, --message=<value>          the release message
  -p, --port=<value>             the port that your app listens to
      --account=<value>          temporarily switch to a different account
      --api-token=<value>        your api token to use for authentication
      --args=<value>             docker image entrypoint args
      --build-arg=<value>...     docker image build args
      --debug                    show debug logs
      --detach                   run build in background
      --no-app-logs              do not stream app logs after deployment
      --no-cache                 do not use cache when building the image
      --path=<value>             app path in your computer
      --platform=<value>         the platform your app needs to run
      --region=<option>          the region you want to deploy your app to
                                 <options: iran|germany>

DESCRIPTION
  deploy an app
```

_See code: [src/commands/deploy.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/deploy.ts)_

## `liara disk create`

create a disk

```
USAGE
  $ liara disk create [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>] [-n <value>] [-s <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
  -n, --name=<value>       disk name
  -s, --size=<value>       disk size
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  create a disk
```

_See code: [src/commands/disk/create.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/disk/create.ts)_

## `liara env list`

list environment variables of an app

```
USAGE
  $ liara env list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml
    |  | ] [--sort <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list environment variables of an app

ALIASES
  $ liara env ls
```

_See code: [src/commands/env/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/env/list.ts)_

## `liara env ls`

list environment variables of an app

```
USAGE
  $ liara env ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml
    |  | ] [--sort <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list environment variables of an app

ALIASES
  $ liara env ls
```

## `liara env set [ENV]`

specifying environment variables to an app

```
USAGE
  $ liara env set [ENV...] [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>]
    [-a <value>] [-f]

ARGUMENTS
  ENV...  key=value pair

FLAGS
  -a, --app=<value>        app id
  -f, --force              force update
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  specifying environment variables to an app
```

_See code: [src/commands/env/set.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/env/set.ts)_

## `liara env unset [ENV]`

remove environment variables from an app

```
USAGE
  $ liara env unset [ENV...] [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>]
    [-a <value>] [-f]

ARGUMENTS
  ENV...  key

FLAGS
  -a, --app=<value>        app id
  -f, --force              force update
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  remove environment variables from an app
```

_See code: [src/commands/env/unset.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/env/unset.ts)_

## `liara help [COMMAND]`

Display help for liara.

```
USAGE
  $ liara help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for liara.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.21/src/commands/help.ts)_

## `liara login`

login to your account

```
USAGE
  $ liara login [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-e
    <value>] [-p <value>] [-i] [--browser chrome|firefox|edge]

FLAGS
  -e, --email=<value>      your email
  -h, --help               Show CLI help.
  -i, --interactive        login with username/password
  -p, --password=<value>   your password
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --browser=<option>   browser to open
                           <options: chrome|firefox|edge>
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  login to your account
```

_See code: [src/commands/login.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/login.ts)_

## `liara logs`

fetch the logs of an app

```
USAGE
  $ liara logs [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>] [-s <value>] [-t] [-f] [-c]

FLAGS
  -a, --app=<value>        app id
  -c, --colorize           colorize log output
  -f, --follow             follow log output
  -h, --help               Show CLI help.
  -s, --since=<value>      show logs since a specific time in the past (e.g. "1 hour ago")
  -t, --timestamps         show timestamps
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  fetch the logs of an app

ALIASES
  $ liara logs
```

## `liara mail create`

create a mail server

```
USAGE
  $ liara mail create [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--domain
    <value>] [--plan <value>] [--mode <value>]

FLAGS
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --domain=<value>     domain
      --mode=<value>       mode
      --plan=<value>       plan
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  create a mail server

ALIASES
  $ liara mail create
```

_See code: [src/commands/mail/create.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/mail/create.ts)_

## `liara mail delete`

delete an mail server

```
USAGE
  $ liara mail delete [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-m
    <value>] [-f]

FLAGS
  -f, --force              force the deletion
  -h, --help               Show CLI help.
  -m, --mail=<value>       mail server id
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  delete an mail server

ALIASES
  $ liara mail delete
```

_See code: [src/commands/mail/delete.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/mail/delete.ts)_

## `liara mail list`

list available mail servers

```
USAGE
  $ liara mail list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available mail servers

ALIASES
  $ liara mail ls
```

_See code: [src/commands/mail/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/mail/list.ts)_

## `liara mail ls`

list available mail servers

```
USAGE
  $ liara mail ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available mail servers

ALIASES
  $ liara mail ls
```

## `liara mail send`

send an email

```
USAGE
  $ liara mail send [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--mail
    <value>] [--from <value>] [--to <value>] [--subject <value>] [--text <value>] [--attachments <value>]

FLAGS
  -h, --help                    Show CLI help.
      --account=<value>         temporarily switch to a different account
      --api-token=<value>       your api token to use for authentication
      --attachments=<value>...  path of your attachments
      --debug                   show debug logs
      --from=<value>            from
      --mail=<value>            mail server id
      --region=<option>         the region you want to deploy your app to
                                <options: iran|germany>
      --subject=<value>         subject
      --text=<value>            text
      --to=<value>              to

DESCRIPTION
  send an email

ALIASES
  $ liara mail send
```

_See code: [src/commands/mail/send.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/mail/send.ts)_

## `liara network create`

create network

```
USAGE
  $ liara network create [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       name of your network
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  create network
```

_See code: [src/commands/network/create.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/network/create.ts)_

## `liara network list`

list available networks

```
USAGE
  $ liara network list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available networks

ALIASES
  $ liara network ls
```

_See code: [src/commands/network/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/network/list.ts)_

## `liara network ls`

list available networks

```
USAGE
  $ liara network ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available networks

ALIASES
  $ liara network ls
```

## `liara plan list`

list available plans

```
USAGE
  $ liara plan list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available plans

ALIASES
  $ liara plan ls
```

_See code: [src/commands/plan/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/plan/list.ts)_

## `liara plan ls`

list available plans

```
USAGE
  $ liara plan ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list available plans

ALIASES
  $ liara plan ls
```

## `liara restart`

restart an app

```
USAGE
  $ liara restart [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  restart an app

ALIASES
  $ liara restart
```

## `liara shell`

run a command in a running applet

```
USAGE
  $ liara shell [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>] [-c <value>]

FLAGS
  -a, --app=<value>        app id
  -c, --command=<value>    [default: /bin/bash] the command to execute
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  run a command in a running applet

ALIASES
  $ liara shell
```

## `liara start`

start an app

```
USAGE
  $ liara start [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  start an app

ALIASES
  $ liara start
```

## `liara stop`

stop an app

```
USAGE
  $ liara stop [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-a
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  stop an app

ALIASES
  $ liara stop
```

## `liara version`

```
USAGE
  $ liara version [--json] [--verbose]

FLAGS
  --verbose  Show additional information about the CLI.

GLOBAL FLAGS
  --json  Format output as json.

FLAG DESCRIPTIONS
  --verbose  Show additional information about the CLI.

    Additionally shows the architecture, node version, operating system, and versions of plugins that the CLI is using.
```

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v2.0.17/src/commands/version.ts)_

## `liara zone ch`

check zone status

```
USAGE
  $ liara zone ch [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml
    |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  check zone status

ALIASES
  $ liara zone ch
```

## `liara zone check`

check zone status

```
USAGE
  $ liara zone check [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml
    |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  check zone status

ALIASES
  $ liara zone ch
```

_See code: [src/commands/zone/check.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/zone/check.ts)_

## `liara zone create`

create a new zone

```
USAGE
  $ liara zone create [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -z, --zone=<value>       zone name (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  create a new zone
```

_See code: [src/commands/zone/create.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/zone/create.ts)_

## `liara zone del`

delete a zone

```
USAGE
  $ liara zone del [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [-y] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output
    csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
  -y, --yes                say yes to continue prompt
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  delete a zone

ALIASES
  $ liara zone del
  $ liara zone rm
```

## `liara zone delete`

delete a zone

```
USAGE
  $ liara zone delete [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [-y] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output
    csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
  -y, --yes                say yes to continue prompt
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  delete a zone

ALIASES
  $ liara zone del
  $ liara zone rm
```

_See code: [src/commands/zone/delete.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/zone/delete.ts)_

## `liara zone get`

inspect zone details

```
USAGE
  $ liara zone get [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml
    |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  inspect zone details
```

_See code: [src/commands/zone/get.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/zone/get.ts)_

## `liara zone list`

list all zones

```
USAGE
  $ liara zone list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list all zones

ALIASES
  $ liara zone ls
```

_See code: [src/commands/zone/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/zone/list.ts)_

## `liara zone ls`

list all zones

```
USAGE
  $ liara zone ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list all zones

ALIASES
  $ liara zone ls
```

## `liara zone record create ZONE`

create a new dns record

```
USAGE
  $ liara zone record create ZONE [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-n
    <value>] [-t <value>] [-l <value>] [-i <value>] [-s <value>] [-m <value>] [-r <value>] [-x <value>]

ARGUMENTS
  ZONE  zone name (domain)

FLAGS
  -h, --help               Show CLI help.
  -i, --ip=<value>...      ip value for record A and AAAA
  -l, --ttl=<value>        time to live
  -m, --mx=<value>...      host and priority values for MX record. mx flag should be like this: --mx
                           <hostname>,<priority>
  -n, --name=<value>       record name
  -r, --srv=<value>...     hostname, port, priority and weight values for SRV record. srv flag should be like this:
                           <hostname>,<port>,<priority>,<weight>
  -s, --host=<value>       host value for record ALIAS and CNAME
  -t, --type=<value>       record type
  -x, --txt=<value>...     text value for record TXT
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  create a new dns record
```

_See code: [src/commands/zone/record/create.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/zone/record/create.ts)_

## `liara zone record get`

get a DNS record

```
USAGE
  $ liara zone record get [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [-n <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output
    csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       Name of the record
  -x, --extended           show extra columns
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  get a DNS record
```

_See code: [src/commands/zone/record/get.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/zone/record/get.ts)_

## `liara zone record list`

list all DNS records

```
USAGE
  $ liara zone record list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml
    |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list all DNS records

ALIASES
  $ liara zone record ls
```

_See code: [src/commands/zone/record/list.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/zone/record/list.ts)_

## `liara zone record ls`

list all DNS records

```
USAGE
  $ liara zone record ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml
    |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  list all DNS records

ALIASES
  $ liara zone record ls
```

## `liara zone record remove`

remove a DNS record

```
USAGE
  $ liara zone record remove [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [-n <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output
    csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       Name of the record
  -x, --extended           show extra columns
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  remove a DNS record

ALIASES
  $ liara zone record rm
```

_See code: [src/commands/zone/record/remove.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/zone/record/remove.ts)_

## `liara zone record rm`

remove a DNS record

```
USAGE
  $ liara zone record rm [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [-n <value>] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output
    csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -n, --name=<value>       Name of the record
  -x, --extended           show extra columns
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  remove a DNS record

ALIASES
  $ liara zone record rm
```

## `liara zone record update`

update a DNS record

```
USAGE
  $ liara zone record update [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [-n <value>] [-l <value>] [-i <value>] [-s <value>] [-m <value>] [-r <value>] [-x <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -h, --help               Show CLI help.
  -i, --ip=<value>...      ip value for record A and AAAA
  -l, --ttl=<value>        time to live
  -m, --mx=<value>...      host and priority values for MX record. mx flag should be like this: --mx
                           <hostname>,<priority>
  -n, --name=<value>       record name
  -r, --srv=<value>...     hostname, port, priority and weight values for SRV record. srv flag should be like this:
                           <hostname>,<port>,<priority>,<weight>
  -s, --host=<value>       host value for record ALIAS and CNAME
  -x, --extended           show extra columns
  -x, --txt=<value>...     text value for record TXT
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  update a DNS record
```

_See code: [src/commands/zone/record/update.ts](https://github.com/liara-ir/liara-cli/blob/v9.3.2-beta.1/src/commands/zone/record/update.ts)_

## `liara zone rm`

delete a zone

```
USAGE
  $ liara zone rm [-h] [--debug] [--api-token <value>] [--region iran|germany] [--account <value>] [-z
    <value>] [-y] [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output
    csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
  -y, --yes                say yes to continue prompt
  -z, --zone=<value>       name of the zone (domain)
      --account=<value>    temporarily switch to a different account
      --api-token=<value>  your api token to use for authentication
      --columns=<value>    only show provided columns (comma-separated)
      --csv                output is csv format [alias: --output=csv]
      --debug              show debug logs
      --filter=<value>     filter property by partial string matching, ex: name=foo
      --no-header          hide table header from output
      --no-truncate        do not truncate output to fit screen
      --output=<option>    output in a more machine friendly format
                           <options: csv|json|yaml>
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>
      --sort=<value>       property to sort by (prepend '-' for descending)

DESCRIPTION
  delete a zone

ALIASES
  $ liara zone del
  $ liara zone rm
```
<!-- commandsstop -->
