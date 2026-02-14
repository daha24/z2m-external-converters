import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import * as r from "zigbee-herdsman-converters/lib/reporting";

import { getEndpointName, determineEndpoint, assertString } from "zigbee-herdsman-converters/lib/utils";
import { CLUSTERS, ATTR } from "/config/zigbee2mqtt/external_converters/azigbee/defines.mjs";
import { Zcl } from "zigbee-herdsman";

// Action names for code input
const actions = [
  "idle",        // 0
  "input_valid", // 1
  "input_invalid", // 2
];

/**
 * Read-only action of code input via multistate input cluster
 */
function action(endpointName) {
  const attributeKey = "presentValue";

  const base = m.text({
    name: "action",
    label: "CodeInput Action",
    description: "Code input action",
    endpointNames: [endpointName],
    cluster: "genMultistateInput",
    attribute: attributeKey,
    access: "STATE_SET",
    entityCategory: "config",
  });

  return {
    ...base,
    toZigbee: [],
    fromZigbee: [
      {
        cluster: "genMultistateInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
          if (
            attributeKey in msg.data &&
            (!endpointName || getEndpointName(msg, model, meta) === endpointName)
          ) {
            const action_id = msg.data.presentValue;
            const action_name = actions[action_id] ?? `action_${action_id}`;
            return { action: action_name };
          }
        },
      },
    ],
  };
}

/**
 * State of code input (ON/OFF)
 */
function state(endpointName) {
  const attributeKey = "codeinput_state";
  const cluster = "genOnOff";
  const attribute = "onOff";

  const base = m.binary({
    name: attributeKey,
    label: "Code input - State",
    description: "State of code input (when off, device has no power, no input is possible)",
    valueOn: ["ON", 1],
    valueOff: ["OFF", 0],
    endpointNames: [endpointName],
    cluster: cluster,
    attribute: attribute,
    access: "ALL",
  });

  return {
    ...base,
    toZigbee: [
      {
        key: [attributeKey],
        convertSet: async (entity, key, value, meta) => {
          const ep = determineEndpoint(entity, meta, cluster);
          const v = value === "ON" || value === 1 || value === true ? "on" : "off";
          await ep.command(cluster, v, {}, { disableDefaultResponse: true });
          await ep.read(cluster, [attribute]);
          return { state: { [attributeKey]: value } };
        },
      },
    ],
    fromZigbee: [
      {
        cluster: cluster,
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
          if (getEndpointName(msg, model, meta) !== endpointName) return;
          if (attribute in msg.data) {
            return { [attributeKey]: msg.data.onOff ? "ON" : "OFF" };
          }
        },
      },
    ],
  };
}

/**
 * Returns code input exposes, optionally filtered by keys
 * @param {string} endpointName
 * @param {string[]} keys - optional array of keys to include, e.g., ["code", "timeout"]
 * 
 * available keys ["state", "action", "code", "timeout", "lockout", "progressive"];
 */
function attributes(endpointName, keys) {
  const all = {
    state: state(endpointName),
    action: action(endpointName),
    code: m.text({
      name: "code",
      endpointNames: [endpointName],
      cluster: CLUSTERS.CODEINPUT_OPTIONS,
      attribute: { ID: ATTR.CODEINPUT_CODE, type: Zcl.DataType.CHAR_STR },
      description:
        "Code sequence for external open/close button (. for short, - for long press, max 8 characters)",
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
      cluster: CLUSTERS.CODEINPUT_OPTIONS,
      attribute: { ID: ATTR.CODEINPUT_TIMEOUT, type: Zcl.DataType.UINT32 },
      access: "ALL",
    }),
    lockout: m.numeric({
      name: "lockout",
      label: "Code Input - Lockout",
      description: "Time in milliseconds to lock input after invalid code entered",
      unit: "ms",
      valueMin: 500,
      valueMax: 5000,
      valueStep: 500,
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: CLUSTERS.CODEINPUT_OPTIONS,
      attribute: { ID: ATTR.CODEINPUT_LOCKOUT, type: Zcl.DataType.UINT32 },
      access: "ALL",
    }),
    progressive: m.binary({
      name: "progressive",
      label: "Code Input - Progressive Lockout",
      description: "Enable or disable progressive (exponential) lockout after invalid input",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: CLUSTERS.CODEINPUT_OPTIONS,
      attribute: { ID: ATTR.CODEINPUT_LOCKOUT_PROGRESSIVE, type: Zcl.DataType.BOOLEAN },
      access: "ALL",
    }),
  };

  if (!keys) return Object.values(all); // no filter, return everything  
  return keys.map((k) => all[k]).filter(Boolean); // filter only requested keys
}


/**
 * Configure code input endpoint
 * Reads & binds only the clusters needed for the specified keys
 * @param {Object} device - Zigbee device object
 * @param {Object} coordinatorEndpoint - coordinator endpoint
 * @param {number|string} endpointID - endpoint number or name
 * @param {string[]} keys - optional array of attribute keys to configure
 */
async function configure(device, coordinatorEndpoint, endpointID, keys) {
  const endpoint = device.getEndpoint(endpointID);

  // Map keys to clusters/attributes
  const readMap = {
    state: { cluster: "genOnOff", attributes: ["onOff"] },          // standard
    action: { cluster: "genMultistateInput", attributes: ["presentValue"] }, // standard
    code: { cluster: CLUSTERS.CODEINPUT_OPTIONS, attributes: [ATTR.CODEINPUT_CODE] }, 
    timeout: { cluster: CLUSTERS.CODEINPUT_OPTIONS, attributes: [ATTR.CODEINPUT_TIMEOUT] },
    lockout: { cluster: CLUSTERS.CODEINPUT_OPTIONS, attributes: [ATTR.CODEINPUT_LOCKOUT] },
    progressive: { cluster: CLUSTERS.CODEINPUT_OPTIONS, attributes: [ATTR.CODEINPUT_LOCKOUT_PROGRESSIVE] },
  };

  const selectedKeys = keys ?? Object.keys(readMap);

  // Collect clusters & attributes to read
  const clustersToRead = {};
  const clustersToBind = new Set();

  selectedKeys.forEach((k) => {
    const entry = readMap[k];
    if (!entry) return;

    clustersToBind.add(entry.cluster); // keep numbers as numbers
    clustersToRead[entry.cluster] = [
      ...(clustersToRead[entry.cluster] ?? []),
      ...entry.attributes,
    ];
  });

  // Read attributes per cluster
  for (const cluster of Object.keys(clustersToRead)) {
    // cluster keys from object keys are strings! convert to number if needed
    const clusterId = isNaN(cluster) ? cluster : Number(cluster);
    await endpoint.read(clusterId, clustersToRead[cluster]);
  }

  // Bind clusters
  await r.bind(endpoint, coordinatorEndpoint, Array.from(clustersToBind));
}



// Export everything as a single object for easy import
export default {
  attributes,
  configure,
};
