import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { readGenBasic } from "./azigbee/config.mjs";
import WinCover from "/config/zigbee2mqtt/external_converters/azigbee/wincover.mjs";

const keys = [
  "activity",
  "controls",
  "calibration_mode",
  "calibration_time",
  "motor_reversal",
  "identify",
];

export default {
  zigbeeModel: ["SMLControl"],
  model: "SMLControl",
  vendor: "FUNAMI corp. Ltd.",
  description: "Velux SML Roller Shutter Control Device",
  ota: true,
  extend: [...WinCover.attributes({ keys })],
  configure: async (device, coordinatorEndpoint) => {
    await readGenBasic(device);
    await WinCover.configure(device, coordinatorEndpoint, { keys });
  },
};
