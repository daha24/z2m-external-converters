import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { readGenBasic } from "./azigbee/config.mjs";
import RgbLight from "/config/zigbee2mqtt/external_converters/azigbee/rgblight.mjs";
import Button from "/config/zigbee2mqtt/external_converters/azigbee/button.mjs";

const endpoints = { rgbLED: 1, button: 2 };

const rgbKeys = ["light_xy", "mode_type", "mode_interval", "identify"];

export default {
  zigbeeModel: ["RGBButtonH"],
  model: "RGBButtonH",
  vendor: "FUNAMI corp. Ltd.",
  description:
    "Composite device with 1-4 buttons (expose action), RGB LED (expose rgb light) and local feedback (visual and/or haptic).",
  ota: true,
  extend: [
    m.deviceEndpoints({ endpoints }),
    ...RgbLight.attributes("rgbLED", endpoints.rgbLED, {}, rgbKeys),
    ...Button.attributes("button", endpoints.button),
  ],
  meta: { multiEndpoint: true },
  exposes: [],
  configure: async (device, coordinatorEndpoint) => {
    await readGenBasic(device, endpoints.rgbLED);
    await RgbLight.configure(device, coordinatorEndpoint, endpoints.rgbLED, rgbKeys);
    await Button.configure(device, coordinatorEndpoint, endpoints.button);
  },
};
