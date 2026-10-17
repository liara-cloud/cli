import { ux } from '@oclif/core';
import Command from '../../team-command.js';

export default class TeamList extends Command {
  static description = 'list the teams of your account';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static aliases = ['team:ls'];

  async run() {
    const { flags } = await this.parse(TeamList);

    // The selected team belongs to a saved account, not to an explicit api token.
    const { team: currentTeam } = flags['api-token']
      ? { team: undefined }
      : flags.account
        ? await this.getAccount(flags.account)
        : await this.getCurrentAccount();

    await this.setGotConfig({ ...flags, 'team-id': '' });
    const teams = await this.getTeams();

    if (teams.length === 0) {
      this.error(
        "You don't belong to any team. Create one via 'liara team:create'.",
      );
    }

    const teamsData = teams.map((team) => ({
      Name: team.name,
      ID: team._id,
      Current: team._id === currentTeam?.id ? '+' : '',
    }));

    // The ID is only needed for --team-id and liara.json, so it's shown with -x.
    ux.table(
      teamsData,
      { Name: {}, ID: { header: 'ID', extended: true }, Current: {} },
      flags,
    );
  }
}
