import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import Command, { permissionLabel } from '../../../team-command.js';
import { ITeamPermission, ITeamPermissionRef } from '../../../types/team.js';

export default class TeamRoleCreate extends Command {
  static description = 'create a custom role in a team';

  static flags = {
    ...Command.flags,
    name: Flags.string({
      char: 'n',
      description: 'role name, in Persian letters',
    }),
    permission: Flags.string({
      char: 'p',
      description:
        'permission as type:name, e.g. project:deploy (at most one per type)',
      multiple: true,
    }),
  };

  async run() {
    const { flags } = await this.parse(TeamRoleCreate);
    await this.setupTeam(flags);

    const name = (flags.name ?? (await this.promptName())).trim();
    const nameValidation = this.validateName(name);
    if (nameValidation !== true) {
      this.error(nameValidation);
    }

    const available = (await this.getPermissionCatalog()).filter(
      (permission) => permission.available && permission.availableForRBAC,
    );

    const permissions = flags.permission
      ? flags.permission.map((value) => this.parsePermission(value, available))
      : await this.promptPermissions(available);

    const permissionsValidation = this.validatePermissions(permissions);
    if (permissionsValidation !== true) {
      this.error(permissionsValidation);
    }

    await this.got.post(this.teamPath('/custom-role'), {
      json: { name, permissions },
    });

    this.log(`Role ${name} created.`);
  }

  validateName(name: string): string | true {
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 50) {
      return 'The role name must be between 3 and 50 characters.';
    }

    if (!/^[\s\u0600-\u06FF]+$/.test(trimmed)) {
      return 'The role name can only contain Persian letters and spaces.';
    }

    return true;
  }

  validatePermissions(permissions: ITeamPermissionRef[]): string | true {
    if (permissions.length === 0) {
      return 'Please select at least one permission.';
    }

    const types = permissions.map((permission) => permission.type);
    const repeated = types.filter(
      (type, index) => types.indexOf(type) !== index,
    );
    if (repeated.length > 0) {
      return `Only one permission per type is allowed. Repeated: ${[...new Set(repeated)].join(', ')}`;
    }

    return true;
  }

  async promptName(): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter the role name (Persian letters):',
      validate: (input: string) => this.validateName(input),
    })) as { name: string };

    return name;
  }

  async promptPermissions(
    available: ITeamPermission[],
  ): Promise<ITeamPermissionRef[]> {
    const { permissions } = (await inquirer.prompt({
      name: 'permissions',
      type: 'checkbox',
      message: 'Select the permissions (one per type):',
      choices: available.map((permission) => ({
        name: permissionLabel(permission),
        value: { type: permission.type, name: permission.name },
      })),
      validate: (input: ITeamPermissionRef[]) =>
        this.validatePermissions(input),
    })) as { permissions: ITeamPermissionRef[] };

    return permissions;
  }
}
