import { CliUx } from "@oclif/core";
import Command from "../../base";
import axios from "axios";
import {
  ramSpacing,
  cpuSpacing,
  diskSpacing,
  priceSpacing,
} from "../../utils/spacing";

export default class PlanList extends Command {
  static description = "list available plans";

  static flags = {
    ...Command.flags,
    ...CliUx.ux.table.flags(),
  };

  static aliases = ["plan:ls"];

  async run() {
    const { flags } = await this.parse(PlanList);
    await this.setAxiosConfig({
      ...flags,
    });

    const {
      data: { plans },
    } = await axios.get("/v1/me", this.axiosConfig);

    const plansData = Object.keys(plans.projects)
      .filter((plan) => plan.includes("ir-") && plans.projects[plan].available)
      .map((plan) => {
        const Plan = plan;
        const availablePlan = plans.projects[plan];
        const tRAM = availablePlan.RAM.amount;
        const RAM = tRAM + ramSpacing(tRAM) + "GB";
        const tCPU = availablePlan.CPU.amount;
        const CPU = tCPU + cpuSpacing(tCPU) + "Core";
        const StorageClass = availablePlan.storageClass;
        const tDisk = availablePlan.volume;
        const Disk = tDisk + diskSpacing(tDisk) + `GB ${StorageClass}`;
        const tPrice = availablePlan.price * 720;
        const Price =
          tPrice.toLocaleString() + priceSpacing(tPrice) + "Tomans/Month";
        return {
          Plan,
          RAM,
          CPU,
          Disk,
          Price,
        };
      });

    CliUx.ux.table(
      plansData,
      { Plan: {}, RAM: {}, CPU: {}, Disk: {}, Price: {} },
      flags
    );
  }
}
