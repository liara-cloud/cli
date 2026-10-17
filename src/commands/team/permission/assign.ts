import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import { IGetProjectsResponse } from '../../../base.js';
import IGetDatabasesResponse from '../../../types/get-dbs-response.js';
import Command, {
  isObjectId,
  memberLabel,
  permissionLabel,
} from '../../../team-command.js';

export default class TeamPermissionAssign extends Command {
  static description = `give a team member a permission on one resource
A member can have one permission per resource. Revoke it to change the level.`;

  static flags = {
    ...Command.flags,
    member: Flags.string({
      char: 'm',
      description: 'email or ID of the member',
    }),
    permission: Flags.string({
      char: 'p',
      description: 'permission as type:name, e.g. project:deploy',
    }),
    resource: Flags.string({
      char: 'r',
      description:
        'resource ID, or the app name for project and the hostname for database permissions',
    }),
  };

  async run() {
    const { flags } = await this.parse(TeamPermissionAssign);
    await this.setupTeam(flags);

    const member = await this.resolveMember(flags.member);

    const available = (await this.getPermissionCatalog()).filter(
      (permission) => permission.available && permission.availableForDAC,
    );

    const permission = this.parsePermission(
      flags.permission ||
        (await this.promptList(
          'Please select a permission:',
          available.map((permission) => ({
            name: permissionLabel(permission),
            value: permissionLabel(permission),
          })),
        )),
      available,
    );

    const resource = await this.resolveResource(
      permission.type,
      flags.resource,
    );

    await this.got.post(this.teamPath(`/${member._id}/assign-permission`), {
      json: {
        permission: { type: permission.type, name: permission.name },
        resourceID: resource.id,
      },
    });

    this.log(
      `${memberLabel(member)} now has ${permissionLabel(permission)} on ${resource.name}.`,
    );
  }

  async resolveResource(
    type: string,
    value?: string,
  ): Promise<{ id: string; name: string }> {
    if (value && isObjectId(value)) {
      return { id: value, name: value };
    }

    let resources: { id: string; name: string }[] | undefined;

    if (type === 'project') {
      const { projects } =
        await this.got('v1/projects').json<IGetProjectsResponse>();
      resources = projects.map((project) => ({
        id: project._id,
        name: project.project_id,
      }));
    }

    if (type === 'database') {
      const { databases } =
        await this.got('v1/databases').json<IGetDatabasesResponse>();
      resources = databases.map((database) => ({
        id: database._id,
        name: database.hostname,
      }));
    }

    if (!resources) {
      const id = value || (await this.promptResourceId(type));
      if (!isObjectId(id)) {
        this.error(`Please pass the ID of the ${type} via --resource.`);
      }

      return { id, name: id };
    }

    if (value) {
      const resource = resources.find((resource) => resource.name === value);
      if (!resource) {
        this.error(`Could not find the ${type} '${value}' in the team.`);
      }

      return resource;
    }

    if (resources.length === 0) {
      this.error(`The team has no ${type}s.`);
    }

    const id = await this.promptList(
      `Please select a ${type}:`,
      resources.map((resource) => ({
        name: resource.name,
        value: resource.id,
      })),
    );
    return resources.find((resource) => resource.id === id)!;
  }

  async promptResourceId(type: string): Promise<string> {
    const { id } = (await inquirer.prompt({
      name: 'id',
      type: 'input',
      message: `Enter the ${type} ID:`,
      validate: (input: string) =>
        isObjectId(input.trim()) || 'Please enter a valid ID.',
    })) as { id: string };

    return id.trim();
  }
}
