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
@liara/cli/7.0.6-beta.0 linux-x64 node-v18.19.0
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
* [`liara app restart`](#liara-app-restart)
* [`liara app shell`](#liara-app-shell)
* [`liara app start`](#liara-app-start)
* [`liara app stop`](#liara-app-stop)
* [`liara autocomplete [SHELL]`](#liara-autocomplete-shell)
* [`liara create`](#liara-create)
* [`liara db list`](#liara-db-list)
* [`liara db ls`](#liara-db-ls)
* [`liara delete`](#liara-delete)
* [`liara disk create`](#liara-disk-create)
* [`liara env list`](#liara-env-list)
* [`liara env ls`](#liara-env-ls)
* [`liara env set [ENV]`](#liara-env-set-env)
* [`liara env unset [ENV]`](#liara-env-unset-env)
* [`liara help [COMMAND]`](#liara-help-command)
* [`liara login`](#liara-login)
* [`liara logs`](#liara-logs)
* [`liara plan list`](#liara-plan-list)
* [`liara plan ls`](#liara-plan-ls)
* [`liara restart`](#liara-restart)
* [`liara shell`](#liara-shell)
* [`liara start`](#liara-start)
* [`liara stop`](#liara-stop)
* [`liara version`](#liara-version)

## `liara account add`

add an account

```
USAGE
  $ liara account add [-h] [--debug] [--api-token <value>] [--region iran|germany] [-e <value>] [-p <value>] [-a
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

_See code: [src/commands/account/add.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/account/add.ts)_

## `liara account list`

list available accounts

```
USAGE
  $ liara account list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--columns <value> | -x]
    [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
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

_See code: [src/commands/account/list.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/account/list.ts)_

## `liara account ls`

list available accounts

```
USAGE
  $ liara account ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--columns <value> | -x]
    [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
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

_See code: [src/commands/account/remove.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/account/remove.ts)_

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

_See code: [src/commands/account/use.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/account/use.ts)_

## `liara app create`

create an app

```
USAGE
  $ liara app create [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [--platform
    <value>] [--plan <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --plan=<value>       plan
      --platform=<value>   platform
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  create an app

ALIASES
  $ liara create
```

_See code: [src/commands/app/create.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/app/create.ts)_

## `liara app delete`

delete an app

```
USAGE
  $ liara app delete [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  delete an app

ALIASES
  $ liara delete
```

_See code: [src/commands/app/delete.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/app/delete.ts)_

## `liara app list`

list available apps

```
USAGE
  $ liara app list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--columns <value> | -x]
    [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
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

_See code: [src/commands/app/list.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/app/list.ts)_

## `liara app logs`

fetch the logs of an app

```
USAGE
  $ liara app logs [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [-s <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
  -s, --since=<value>      show logs since timestamp
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  fetch the logs of an app

ALIASES
  $ liara logs
```

_See code: [src/commands/app/logs.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/app/logs.ts)_

## `liara app ls`

list available apps

```
USAGE
  $ liara app ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--columns <value> | -x]
    [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
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

## `liara app restart`

restart an app

```
USAGE
  $ liara app restart [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  restart an app

ALIASES
  $ liara restart
```

_See code: [src/commands/app/restart.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/app/restart.ts)_

## `liara app shell`

run a command in a running applet

```
USAGE
  $ liara app shell [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [-c <value>]

FLAGS
  -a, --app=<value>        app id
  -c, --command=<value>    [default: /bin/bash] the command to execute
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  run a command in a running applet

ALIASES
  $ liara shell
```

_See code: [src/commands/app/shell.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/app/shell.ts)_

## `liara app start`

start an app

```
USAGE
  $ liara app start [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  start an app

ALIASES
  $ liara start
```

_See code: [src/commands/app/start.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/app/start.ts)_

## `liara app stop`

stop an app

```
USAGE
  $ liara app stop [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  stop an app

ALIASES
  $ liara stop
```

_See code: [src/commands/app/stop.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/app/stop.ts)_

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

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.1.11/src/commands/autocomplete/index.ts)_

## `liara create`

create an app

```
USAGE
  $ liara create [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [--platform
    <value>] [--plan <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --plan=<value>       plan
      --platform=<value>   platform
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  create an app

ALIASES
  $ liara create
```

## `liara db list`

list available databases

```
USAGE
  $ liara db list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--columns <value> | -x]
    [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
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

_See code: [src/commands/db/list.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/db/list.ts)_

## `liara db ls`

list available databases

```
USAGE
  $ liara db ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--columns <value> | -x]
    [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
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

## `liara delete`

delete an app

```
USAGE
  $ liara delete [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  delete an app

ALIASES
  $ liara delete
```

## `liara disk create`

create a disk

```
USAGE
  $ liara disk create [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [-n <value>] [-s
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
  -n, --name=<value>       disk name
  -s, --size=<value>       disk size
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  create a disk
```

_See code: [src/commands/disk/create.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/disk/create.ts)_

## `liara env list`

list environment variables of an app

```
USAGE
  $ liara env list [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
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

_See code: [src/commands/env/list.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/env/list.ts)_

## `liara env ls`

list environment variables of an app

```
USAGE
  $ liara env ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [--columns
    <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort
    <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
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
  $ liara env set [ENV...] [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [-f]

ARGUMENTS
  ENV...  key=value pair

FLAGS
  -a, --app=<value>        app id
  -f, --force              force update
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  specifying environment variables to an app
```

_See code: [src/commands/env/set.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/env/set.ts)_

## `liara env unset [ENV]`

remove environment variables from an app

```
USAGE
  $ liara env unset [ENV...] [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [-f]

ARGUMENTS
  ENV...  key

FLAGS
  -a, --app=<value>        app id
  -f, --force              force update
  -h, --help               Show CLI help.
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  remove environment variables from an app
```

_See code: [src/commands/env/unset.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/env/unset.ts)_

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
  $ liara login [-h] [--debug] [--api-token <value>] [--region iran|germany] [-e <value>] [-p <value>]

FLAGS
  -e, --email=<value>      your email
  -h, --help               Show CLI help.
  -p, --password=<value>   your password
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  login to your account
```

_See code: [src/commands/login.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/login.ts)_

## `liara logs`

fetch the logs of an app

```
USAGE
  $ liara logs [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [-s <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
  -s, --since=<value>      show logs since timestamp
      --api-token=<value>  your api token to use for authentication
      --debug              show debug logs
      --region=<option>    the region you want to deploy your app to
                           <options: iran|germany>

DESCRIPTION
  fetch the logs of an app

ALIASES
  $ liara logs
```

## `liara plan list`

list available plans

```
USAGE
  $ liara plan list [-h] [--debug] [--api-token <value>] [--region iran|germany] [--columns <value> | -x]
    [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
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

_See code: [src/commands/plan/list.ts](https://github.com/liara-ir/liara-cli/blob/v7.0.6-beta.0/src/commands/plan/list.ts)_

## `liara plan ls`

list available plans

```
USAGE
  $ liara plan ls [-h] [--debug] [--api-token <value>] [--region iran|germany] [--columns <value> | -x]
    [--filter <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help               Show CLI help.
  -x, --extended           show extra columns
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
  $ liara restart [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
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
  $ liara shell [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>] [-c <value>]

FLAGS
  -a, --app=<value>        app id
  -c, --command=<value>    [default: /bin/bash] the command to execute
  -h, --help               Show CLI help.
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
  $ liara start [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
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
  $ liara stop [-h] [--debug] [--api-token <value>] [--region iran|germany] [-a <value>]

FLAGS
  -a, --app=<value>        app id
  -h, --help               Show CLI help.
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

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v2.2.9/src/commands/version.ts)_
<!-- commandsstop -->
