import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import Command, {
  permissionLabel,
  requireInput,
} from '../../../team-command.js';
import { ITeamPermission, ITeamPermissionRef } from '../../../types/team.js';

export default class TeamRoleCreate extends Command {
  static description = 'create a custom role in a team';

  static flags = {
    ...Command.flags,
    name: Flags.string({
      char: 'n',
      description: 'role name',
    }),
    permission: Flags.string({
      char: 'p',
      description: 'permission as type:name, e.g. project:deploy',
      multiple: true,
    }),
  };

  async run() {
    const { flags } = await this.parse(TeamRoleCreate);
    await this.setupTeam(flags);

    const name = (flags.name ?? (await this.promptName())).trim();

    const available = (await this.getPermissionCatalog()).filter(
      (permission) => permission.available && permission.availableForRBAC,
    );

    const permissions = flags.permission
      ? flags.permission.map((value) => this.parsePermission(value, available))
      : await this.promptPermissions(available);

    await this.got.post(this.teamPath('/custom-role'), {
      json: { name, permissions },
    });

    this.log(`Role ${name} created.`);
  }

  async promptName(): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter the role name:',
      validate: requireInput,
    })) as { name: string };

    return name;
  }

  async promptPermissions(
    available: ITeamPermission[],
  ): Promise<ITeamPermissionRef[]> {
    const { permissions } = (await inquirer.prompt({
      name: 'permissions',
      type: 'checkbox',
      message: 'Select the permissions:',
      choices: available.map((permission) => ({
        name: permissionLabel(permission),
        value: { type: permission.type, name: permission.name },
      })),
    })) as { permissions: ITeamPermissionRef[] };

    return permissions;
  }
}
