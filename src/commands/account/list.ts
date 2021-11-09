import { cli } from "cli-ux";
import Command from "../../base";

export default class AccountList extends Command {
  static description = "list available accounts";

  static flags = {
    ...Command.flags,
    ...cli.table.flags(),
  };

  static aliases = ["account:ls"];

  async run() {
    const { flags } = this.parse(AccountList);
    const liara_json = this.readGlobalConfig();
    if (
      !liara_json ||
      !liara_json.accounts ||
      Object.keys(liara_json.accounts).length === 0
    ) {
      this.error(
        "Please add your accounts via 'liara account:add' command, first."
      );
    }

    const accountsData = Object.entries(liara_json.accounts).map((acc) => {
      const Name = acc[0];
      const Email = acc[1].email;
      const Region = acc[1].region;
      const Current = Name === liara_json.current ? "👍" : "";
      return { Name, Email, Region, Current };
    });

    cli.table(
      accountsData,
      { Name: {}, Email: {}, Region: {}, Current: {} },
      flags
    );
  }
}
