import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { readGenBasic } from "./azigbee/config.mjs";
import WinCover from "/config/zigbee2mqtt/external_converters/azigbee/wincover.mjs";
import CodeInput from "/config/zigbee2mqtt/external_converters/azigbee/codeinput.mjs";

const endpoints = { roller: 1, codeinput: 2 };

export default {
  zigbeeModel: ["GDControl"],
  model: "GDControl",
  vendor: "FUNAMI corp. Ltd.",
  description:
    "Composite device to control garage door with local code input (external button to open/close garage door IF valid short/long clicks sequence is pressed).",
  ota: true,
  extend: [
    m.deviceEndpoints({ endpoints }),
    ...WinCover.attributes("roller", endpoints.roller, {
      lookup: {
        OPENING: 1,
        CLOSING: 2,
      },
    }),
    ...CodeInput.attributes("codeinput", endpoints.codeinput),
  ],
  meta: { multiEndpoint: true },
  configure: async (device, coordinatorEndpoint) => {
    await readGenBasic(device, endpoints.roller);
    await WinCover.configure(device, coordinatorEndpoint, endpoints.roller);
    await CodeInput.configure(device, coordinatorEndpoint, endpoints.codeinput);
  },
};
