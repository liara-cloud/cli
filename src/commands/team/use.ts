import fs from 'fs-extra';
import chalk from 'chalk';
import { Flags } from '@oclif/core';

import ITeam from '../../types/team.js';
import { IAccountTeam } from '../../base.js';
import Command from '../../team-command.js';
import { GLOBAL_CONF_PATH, GLOBAL_CONF_VERSION } from '../../constants.js';

export default class TeamUse extends Command {
  static description = 'select the team to use by default';

  static flags = {
    ...Command.flags,
    team: Flags.string({
      description: 'name of the team',
      exclusive: ['team-id'],
    }),
    personal: Flags.boolean({
      description: 'use your personal account instead of a team',
      exclusive: ['team-id', 'team'],
    }),
  };

  async run() {
    const { flags } = await this.parse(TeamUse);

    if (flags['api-token']) {
      this.error(
        'The selected team is saved per account and cannot be set for an api token. Use the --team-id flag instead.',
      );
    }

    const liara_json = await this.readGlobalConfig();
    const accountName =
      flags.account || (await this.getCurrentAccount()).accountName;
    const account = accountName ? liara_json.accounts[accountName] : undefined;

    if (!accountName || !account) {
      this.error(
        flags.account
          ? `Could not find any account associated with this name ${flags.account}.`
          : "Please log in using the 'liara login' command, first.",
      );
    }

    let team: IAccountTeam | undefined;

    if (!flags.personal) {
      await this.setGotConfig({ account: accountName, 'team-id': '' });
      const teams = await this.getTeams();

      const teamId =
        flags['team-id'] ??
        (flags.team === undefined
          ? await this.promptTeam(teams, {
              personal: true,
              current: account.team?.id || '',
            })
          : this.findTeamByName(teams, flags.team));

      if (teamId) {
        const selected = teams.find((team) => team._id === teamId);
        if (!selected) {
          this.error(`You don't have a team with ID '${teamId}'`);
        }

        team = { id: selected._id, name: selected.name };
      }
    }

    if (team) {
      account.team = team;
    } else {
      delete account.team;
    }

    fs.writeFileSync(
      GLOBAL_CONF_PATH,
      JSON.stringify({
        version: GLOBAL_CONF_VERSION,
        accounts: liara_json.accounts,
      }),
    );

    this.log(
      chalk.green(
        team
          ? `> Current team is: ${team.name}`
          : '> Current team is: personal account',
      ),
    );
  }

  findTeamByName(teams: ITeam[], name: string): string {
    const search = name.trim().toLowerCase();
    const matches = teams.filter((team) => team.name.toLowerCase() === search);

    if (matches.length === 0) {
      this.error(`You don't have a team named '${name}'.`);
    }

    // Team names are unique per owner, so teams shared by others can repeat.
    if (matches.length > 1) {
      this.error(`You have more than one team named '${name}'.
Please pass its ID via --team-id instead. See 'liara team:list -x'.`);
    }

    return matches[0]._id;
  }
}
