import path from 'node:path';
import fs from 'fs-extra';

import ITeam from '../types/team.js';
import { IAccount } from '../base.js';
import Command from '../team-command.js';

interface ITeamInfo {
  id: string;
  member: boolean;
  // Null when the user isn't a member of the team and its name isn't saved.
  name: null | string;
}

export default class Whoami extends Command {
  static description = `show the account and team that commands run as
The team comes from --team-id, then the team selected via 'liara team:use'. Without either, commands run on your personal account.`;

  static flags = {
    ...Command.flags,
  };

  static enableJsonFlag = true;

  static aliases = ['account:whoami'];

  async run() {
    const { flags } = await this.parse(Whoami);

    // The same account and team every other command resolves to. A selected
    // team belongs to a saved account, so it isn't used with --api-token.
    const account = flags['api-token']
      ? undefined
      : flags.account
        ? {
            ...(await this.getAccount(flags.account)),
            accountName: flags.account,
          }
        : await this.getCurrentAccount();

    if (account && !account.accountName) {
      this.error("You're not logged in. Please log in using 'liara login'.");
    }

    const teamId = flags['team-id'] ?? account?.team?.id;
    const teamSource =
      flags['team-id'] === undefined ? 'team-use' : 'team-id-flag';

    // deploy and app:shell read team-id from liara.json, but --team-id wins.
    const liaraJsonTeamId =
      flags['team-id'] === undefined ? this.readLiaraJsonTeamId() : undefined;

    await this.setGotConfig({ ...flags, 'team-id': '' });

    const needsTeams = Boolean(teamId || liaraJsonTeamId);
    const [{ user }, teams] = await Promise.all([
      this.got('v1/me').json<{ user: IAccount }>(),
      needsTeams ? this.getTeams() : Promise.resolve([]),
    ]);

    const team = teamId
      ? this.teamInfo(teamId, teams, account?.team?.name)
      : null;
    const liaraJsonTeam =
      liaraJsonTeamId === undefined
        ? undefined
        : liaraJsonTeamId
          ? this.teamInfo(liaraJsonTeamId, teams)
          : null;

    this.log(
      account
        ? `Account: ${account.accountName} (${user.email})`
        : `Account: ${user.email}, from --api-token`,
    );

    if (team) {
      this.log(
        `Team:    ${this.teamLabel(team)}, ${
          teamSource === 'team-id-flag'
            ? 'from --team-id'
            : "selected via 'liara team:use'"
        }`,
      );
    } else {
      this.log('Team:    personal account');
    }

    if (liaraJsonTeam !== undefined && liaraJsonTeam?.id !== team?.id) {
      this.log(
        `Note:    liara.json in this directory sets ${
          liaraJsonTeam ? this.teamLabel(liaraJsonTeam) : 'the personal account'
        } for 'liara deploy' and 'liara app:shell'.`,
      );
    }

    if (team && !team.member) {
      this.warn(
        teamSource === 'team-id-flag'
          ? "You're not a member of the team passed via --team-id."
          : "You're not a member of the selected team anymore. Please select another via 'liara team:use'.",
      );
    }

    if (liaraJsonTeam && !liaraJsonTeam.member) {
      this.warn("You're not a member of the team set in liara.json.");
    }

    return {
      account: {
        name: account?.accountName ?? null,
        email: user.email,
        fullname: user.fullname,
      },
      // Null means the personal account.
      team: team && { ...team, source: teamSource },
      ...(liaraJsonTeam !== undefined && {
        liaraJson: { team: liaraJsonTeam },
      }),
    };
  }

  teamInfo(id: string, teams: ITeam[], savedName?: string): ITeamInfo {
    const team = teams.find((team) => team._id === id);
    return {
      id,
      name: team?.name ?? savedName ?? null,
      member: Boolean(team),
    };
  }

  teamLabel({ id, name }: ITeamInfo) {
    return name ? `${name} (${id})` : id;
  }

  // Undefined when there is no liara.json or it doesn't set a team. An empty
  // team-id means the personal account.
  readLiaraJsonTeamId(): string | undefined {
    const liaraJSONPath = path.join(process.cwd(), 'liara.json');
    const content = fs.readJSONSync(liaraJSONPath, { throws: false });
    const teamId = content?.['team-id'];

    return typeof teamId === 'string' ? teamId : undefined;
  }
}
