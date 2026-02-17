import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { readGenBasic } from "./azigbee/config.mjs";
import WinCover from "/config/zigbee2mqtt/external_converters/azigbee/wincover.mjs";
import CodeInput from "/config/zigbee2mqtt/external_converters/azigbee/codeinput.mjs";

const endpoints = { gate: 1, codeinput: 2 };

export default {
  zigbeeModel: ["GMControl"],
  model: "GMControl",
  vendor: "FUNAMI corp. Ltd.",
  description:
    "Composite device to remote control gate motor analog controller CR/34 Serai Mercurio 300 with local code input (external button to open/close garage door IF valid short/long clicks sequence is entered).",
  ota: true,
  extend: [
    m.deviceEndpoints({ endpoints }),
    ...WinCover.attributes("gate", endpoints.gate, ["moving", "obstruction", "lift", "calibration_time", "warnOnMove", "identify"]),
    ...CodeInput.attributes("codeinput", endpoints.codeinput),
  ],
  meta: { multiEndpoint: true },
  configure: async (device, coordinatorEndpoint) => {
    await readGenBasic(device, endpoints.gate); 
    await WinCover.configure(device, coordinatorEndpoint, endpoints.gate);
    await CodeInput.configure(device, coordinatorEndpoint, endpoints.codeinput);
  },
};
