import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { readGenBasic } from "./azigbee/config.mjs";
import WinCover from "/config/zigbee2mqtt/external_converters/azigbee/wincover.mjs";
import CodeInput from "/config/zigbee2mqtt/external_converters/azigbee/codeinput.mjs";

const endpoints = { motor: 1, codeinput: 2 };

const wincoverKeys = [
  "activity",
  "obstruction",
  "controls",
  "calibration_time",
  "warn_on_move",
  "identify",
];

const wincoverOptions = {
  lookup: {
    OPENING: 1,
    CLOSING: 2,
  },
};

export default {
  zigbeeModel: ["GMControl"],
  model: "GMControl",
  vendor: "FUNAMI corp. Ltd.",
  description:
    "Composite device to remote control sliding gate analog controller CR/34 Serai Mercurio 300 with local code input (external button to open/close garage door IF valid short/long clicks sequence is entered).",
  ota: true,
  extend: [
    m.deviceEndpoints({ endpoints }),
    ...WinCover.attributes("motor", endpoints.motor, wincoverOptions, wincoverKeys),
    ...CodeInput.attributes("codeinput", endpoints.codeinput),
  ],
  meta: { multiEndpoint: true },
  configure: async (device, coordinatorEndpoint) => {
    await readGenBasic(device, endpoints.motor);
    await WinCover.configure(device, coordinatorEndpoint, endpoints.motor, wincoverKeys);
    await CodeInput.configure(device, coordinatorEndpoint, endpoints.codeinput);
  },
};
