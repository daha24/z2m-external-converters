import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { assertString } from "zigbee-herdsman-converters/lib/utils";
import { Zcl } from "zigbee-herdsman";
import { config_map, filter_keys, CLUSTERS, ATTR } from "/config/zigbee2mqtt/external_converters/azigbee/config.mjs";
import { state } from "./state.mjs";
import { action } from "./action.mjs";

/**
 * Action names for code input action attribute
 */
const action_values = [
  "idle", // 0
  "input_valid", // 1
  "input_invalid", // 2
];

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
 * @param {string[]} keys - optional array of keys to include, e.g., ["code", "timeout"]
 *                          available keys ["state", "action", "code", "timeout", "lockout", "progressive"];
 */
function attributes(endpointName, keys) {
  const all = {
    state: state({
      endpointName,
      attributeName: "codeinput_state",
      label: "Code Input - State",
      description:
        "State of code input (when off, device has no power, no input is possible)",
    }),
    action: action({
      endpointName,
      label: "Code Input - Action",
      description:
        "Code input button action detected (input_valid/input_invalid/idle)",
      values: action_values,
    }),
    code: m.text({
      name: "code",
      endpointNames: [endpointName],
      cluster: map.code.cluster,
      attribute: { ID: map.code.attribute, type: map.code.type },
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
      label: "Code Input - Timeout",
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
      label: "Code Input - Lockout",
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
      label: "Code Input - Progressive Lockout",
      description:
        "Enable or disable progressive (exponential) lockout after invalid input",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.progressive.cluster,
      attribute: { ID: map.progressive.attribute, type: map.progressive.type },
      access: "ALL",
    }),
  };
  return filter_keys(all, keys);
}


/**
 * Configure code input endpoint
 * Reads & binds only the clusters needed for the specified keys
 */
async function configure(device, coordinatorEndpoint, endpointID, keys) {
  return config_map(device, coordinatorEndpoint, endpointID, map, keys);
}

export default {
  attributes,
  configure,
};
