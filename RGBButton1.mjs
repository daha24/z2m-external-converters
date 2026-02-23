import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { readGenBasic } from "./azigbee/config.mjs";
import RgbLight from "/config/zigbee2mqtt/external_converters/azigbee/rgblight.mjs";
import Button from "/config/zigbee2mqtt/external_converters/azigbee/button.mjs";

const endpoints = { rgbLED: 1, button: 2 };

const rgbKeys = ["light_xy", "mode_type", "mode_interval", "identify"];

const buttonOptions = {
  feedback: {
    off: 0,
    on: 1,
  },
};

export default {
  zigbeeModel: ["RGBButton1"],
  model: "RGBButton1",
  vendor: "FUNAMI corp. Ltd.",
  description:
    "Composite device with 1-4 buttons (expose action), RGB LED (expose rgb light) and local feedback (visual and/or haptic).",
  ota: true,
  extend: [
    m.deviceEndpoints({ endpoints }),
    ...RgbLight.attributes("rgbLED", endpoints.rgbLED, {}, rgbKeys),
    ...Button.attributes("button", endpoints.button, buttonOptions),
  ],
  meta: { multiEndpoint: true },
  exposes: [],
  configure: async (device, coordinatorEndpoint) => {
    await readGenBasic(device, endpoints.rgbLED);
    await RgbLight.configure(device, coordinatorEndpoint, endpoints.rgbLED, rgbKeys);
  },
};
