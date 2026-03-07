import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { readGenBasic } from "./azigbee/config.mjs";
import WinCover from "/config/zigbee2mqtt/external_converters/azigbee/wincover.mjs";

const endpoints = { roller: 1 };
const keys = [
  "activity",
  "controls",
  "calibration_mode",
  "calibration_time",
  "motor_reversal",
  "identify"
];

export default {
  zigbeeModel: ["SMLControl"],
  model: "SMLControl",
  vendor: "FUNAMI corp. Ltd.",
  description: "Velux SML Roller Shutter Control Device",
  ota: true,
  extend: [
    m.deviceEndpoints({ endpoints }),
    ...WinCover.attributes("roller", endpoints.roller, {}, keys),
  ],
  meta: { multiEndpoint: true },
  configure: async (device, coordinatorEndpoint) => {
    await readGenBasic(device, endpoints.roller);
    await WinCover.configure(device, coordinatorEndpoint, endpoints.roller, keys);
  },
};
