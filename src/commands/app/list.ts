import { Flags, ux } from '@oclif/core';
import * as shamsi from 'shamsi-date-converter';

import Command, { IGetProjectsResponse } from '../../base.js';

export default class AppList extends Command {
  static description = 'list available apps';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
    'wp-plus': Flags.boolean({
      description: 'show wordpress plus apps',
    }),
  };

  static aliases = ['app:ls'];

  async run() {
    const { flags } = await this.parse(AppList);

    await this.setGotConfig(flags);

    const { projects } = await this.got('v1/projects', {
      searchParams: { 'is-wp-plus': flags['wp-plus'] },
    }).json<IGetProjectsResponse>();

    if (projects.length === 0) {
      this.error("Please create an app via 'liara app:create' command, first.");
    }

    const appsData = projects.map((project) => {
      const shamshiDate = shamsi.gregorianToJalali(
        new Date(project.created_at)
      );
      return {
        Name: project.project_id,
        Platform: project.type,
        Plan: project.planID,
        Status: project.status,
        Scale: project.scale,
        'Created At': `${shamshiDate[0]}-${shamshiDate[1]}-${shamshiDate[2]}`,
      };
    });

    ux.table(
      appsData,
      {
        Name: {},
        Platform: {},
        Plan: {},
        Scale: {},
        Status: {},
        'Created At': {},
      },
      flags
    );
  }
}
