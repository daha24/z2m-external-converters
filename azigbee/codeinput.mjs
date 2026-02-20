import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { assertString } from "zigbee-herdsman-converters/lib/utils";
import { Zcl } from "zigbee-herdsman";
import {
  config_map,
  filter_keys,
  identify,
  CLUSTERS,
  ATTR,
} from "/config/zigbee2mqtt/external_converters/azigbee/config.mjs";
import { state } from "./state.mjs";
import { action } from "./action.mjs";

/**
 * Central mapping of attribute keys to clusters and attributes
 * Used in both attributes() and configure()
 */
const map = {
  state: {
    cluster: "genOnOff",
    attribute: "onOff",
  },
  action: {
    cluster: "genMultistateInput",
    attribute: "presentValue",
  },
  code: {
    cluster: CLUSTERS.CODEINPUT_OPTIONS,
    attribute: ATTR.CODEINPUT_CODE,
    type: Zcl.DataType.CHAR_STR,
  },
  timeout: {
    cluster: CLUSTERS.CODEINPUT_OPTIONS,
    attribute: ATTR.CODEINPUT_TIMEOUT,
    type: Zcl.DataType.UINT32,
  },
  lockout: {
    cluster: CLUSTERS.CODEINPUT_OPTIONS,
    attribute: ATTR.CODEINPUT_LOCKOUT,
    type: Zcl.DataType.UINT32,
  },
  progressive: {
    cluster: CLUSTERS.CODEINPUT_OPTIONS,
    attribute: ATTR.CODEINPUT_LOCKOUT_PROGRESSIVE,
    type: Zcl.DataType.BOOLEAN,
  },
};

/**
 * Returns code input exposes, optionally filtered by keys
 * @param {string} endpointName
 * @param {integer} endpointID
 * @param {string[]} keys - optional array of keys to include, e.g., ["code", "timeout"]
 *                          available keys ["state", "action", "code", "timeout", "lockout", "progressive", "identify"];
 */
function attributes(endpointName, endpointID, keys) {
  const all = {
    state: state({
      endpointName,
      attributeName: "codeinput_state",
      label: `Code Button State (Endpoint: ${endpointName})`,
      description:
        "State of code input (when off, device has no power, no input is possible)",
    }),
    action: action({
      endpointName,
      lookup: {
        idle: 0,
        input_valid: 1,
        input_invalid: 2,
        lockout: 254,
        unknown: 255,
      },
    }),
    code: m.text({
      name: "code",
      label: `Code Button Secret (Endpoint: ${endpointName})`,
      endpointName,
      cluster: map.code.cluster,
      attribute: { ID: map.code.attribute, type: map.code.type },
      entityCategory: "config",
      description:
        "Code sequence for external open/close button (. for short, - for long press, max 8 characters, empty = any click valid)",
      access: "ALL",
      validate: (value) => {
        assertString(value);
        if (value.length > 8)
          throw new Error("Length of text is greater than 8");
      },
    }),
    timeout: m.numeric({
      name: "timeout",
      label: `Code Button Timeout`,
      description: "Time in milliseconds to detect idle state (end of input)",
      unit: "ms",
      valueMin: 500,
      valueMax: 5000,
      valueStep: 500,
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.timeout.cluster,
      attribute: { ID: map.timeout.attribute, type: map.timeout.type },
      access: "ALL",
    }),
    lockout: m.numeric({
      name: "lockout",
      label: `Code Button Lockout`,
      description:
        "Time in milliseconds to lock input after invalid code entered",
      unit: "ms",
      valueMin: 500,
      valueMax: 5000,
      valueStep: 500,
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.lockout.cluster,
      attribute: { ID: map.lockout.attribute, type: map.lockout.type },
      access: "ALL",
    }),
    progressive: m.binary({
      name: "progressive",
      label: `Code Button Progressive Lockout`,
      description:
        "Enable or disable progressive (exponential) lockout after invalid input",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointName,
      cluster: map.progressive.cluster,
      attribute: { ID: map.progressive.attribute, type: map.progressive.type },
      access: "ALL",
    }),
    identify: identify({ [endpointName]: endpointID }),
  };
  return filter_keys(all, keys);
}

/**
 * Configure code input endpoint
 * Reads & binds only the clusters needed for the specified keys
 */
async function configure(device, coordinatorEndpoint, endpointID, keys) {
  await config_map(device, coordinatorEndpoint, endpointID, map, keys);
  // setup reporting for onOff cluster as device itselff can switch it off/on for invalid inputs
  // AZigbee CodeInput C++ code DOES NOT change the state of button ON invalid output, so reporting cant work, get state cant work
  // either report it or maybe use "input_invalid" for sensing the and change it to idle ONLY after it is listening again (or add new action "lockout")
  // const ep = device.getEndpoint(endpointID);
  // await ep.configureReporting("genOnOff", [{  attribute: "onOff",  minimumReportInterval: 0,  maximumReportInterval: 65000,  reportableChange: 0,},  ]);
}

export default {
  attributes,
  configure,
};
