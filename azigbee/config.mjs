import * as r from "zigbee-herdsman-converters/lib/reporting";
import * as e from "zigbee-herdsman-converters/lib/exposes";
import { access as ea } from "zigbee-herdsman-converters/lib/exposes";
import { getOptions } from "zigbee-herdsman-converters/lib/utils";

// Custom cluster IDs
export const CLUSTERS = {
  BUTTON_OPTIONS: 0xa000,
  CODEINPUT_OPTIONS: 0xfcc1,
  WINCOVER_OPTIONS: 0xfcd1,
  LIGHT_MODE: 0xfce2,
  RGB_LIGHT_MODE: 0xa001,
  MEDIA_PLAYER: 0xfcf1,
  RELAY_OPTIONS: 0xfce1,
};

// Custom attribute IDs
export const ATTR = {
  // Button cluster
  BUTTON_FEEDBACK: 0xa000,
  BUTTON_LONG_PRESS_DELAY: 0xa001,
  BUTTON_FEEDBACK_COLOR: 0xa002,
  BUTTON_FEEDBACK_LEVEL: 0xa003,

  // Code input cluster
  CODEINPUT_CODE: 0xfcc0,
  CODEINPUT_TIMEOUT: 0xfcc1,
  CODEINPUT_LOCKOUT: 0xfcc2,
  CODEINPUT_LOCKOUT_PROGRESSIVE: 0xfcc3,

  // Window covering / gate
  WINCOVER_TUYA_MOVING_STATE: 0xf000,
  WINCOVER_TUYA_CALIBRATION: 0xf001,
  WINCOVER_TUYA_MOTOR_REVERSAL: 0xf002,
  WINCOVER_MOES_CALIBRATION_TIME: 0xf003,
  WINCOVER_WARN_ON_MOVE: 0xfcd0,
  WINCOVER_OBSTRUCTION_SENSOR: 0xfcd2,

  // Light clusters
  LIGHT_MODE: 0xfce3,
  LIGHT_INTERVAL: 0xfce4,
  RGB_LIGHT_MODE: 0xa002,
  RGB_LIGHT_INTERVAL: 0xa003,

  // Media player
  MEDIA_PLAYER_STATE: 0xfcf2,
  MEDIA_PLAYER_COMMAND: 0xfcf3,
  MEDIA_PLAYER_VOLUME: 0xfcf4,
  MEDIA_PLAYER_TRACK_COUNT: 0xfcf5,
  MEDIA_PLAYER_CURRENT_TRACK_NUM: 0xfcf6,
  MEDIA_PLAYER_PLAYMODE: 0xfcf7,

  // Relay cluster
  RELAY_TYPE: 0xfce2,
  RELAY_COUNTDOWN: 0xfce3,
};

/**
 * Generic configure function for any AZigbee endpoint
 * @param {Object} device - Zigbee device object
 * @param {Object} coordinatorEndpoint - coordinator endpoint
 * @param {number|string} endpointID - endpoint number or name
 * @param {Object} map - mapping of keys to { cluster, attribute }
 * @param {string[]} keys - optional array of keys to configure
 */
export async function config_map(
  device,
  coordinatorEndpoint,
  endpointID,
  map,
  keys
) {
  const endpoint = device.getEndpoint(endpointID);
  const selectedKeys = keys ?? Object.keys(map);

  const clustersToRead = {};
  const clustersToBind = new Set();

  selectedKeys.forEach((k) => {
    const entry = map[k];
    if (!entry) return;

    // skip null clusters
    if (entry.cluster != null) {
      clustersToBind.add(entry.cluster);

      // single attribute, not array
      clustersToRead[entry.cluster] = [
        ...(clustersToRead[entry.cluster] ?? []),
        entry.attribute,
      ];
    }
  });

  // Read attributes per cluster
  for (const cluster of Object.keys(clustersToRead)) {
    const clusterId = isNaN(cluster) ? cluster : Number(cluster);
    await endpoint.read(clusterId, clustersToRead[cluster]);
  }

  // Bind clusters
  if (clustersToBind.size > 0) {
    await r.bind(endpoint, coordinatorEndpoint, Array.from(clustersToBind));
  }
}

/**
 * Filters an object of attributes by an optional keys array
 * @param {Object} all - object with all possible attributes
 * @param {string[]} keys - optional array of keys to include
 * @returns {Array} array of selected attribute objects
 */
export function filter_keys(all, keys) {
  if (!keys) return Object.values(all);
  return keys.map((k) => all[k]).filter(Boolean);
}

/**
 * Reads standard genBasic attributes for a given endpoint
 * @param {Object} device - Zigbee device object
 * @param {number|string} endpointID - endpoint number or name
 */
export async function readGenBasic(device, endpointID) {
  const ep = device.getEndpoint(endpointID);
  if (!ep) throw new Error(`Endpoint ${endpointID} not found`);

  await ep.read("genBasic", [
    "modelId",
    "swBuildId",
    "dateCode",
    "powerSource",
  ]);
}

/**
 * Creates standard Identify exposes for multiple endpoints
 * @param {Object} endpoints - a standard z2m endpoint map as used in m.deviceEndpoints
 * @returns {Object} { exposes, toZigbee, isModernExtend }
 */
export function identify(endpoints) {
  if (!endpoints) throw new Error("Endpoint mapping required");

  const exposes = [];
  const toZigbee = [];

  for (const [name, id] of Object.entries(endpoints)) {
    const keyName = `identify_${name}`;

    exposes.push(
      e
        .enum(keyName, ea.SET, ["identify"])
        .withLabel("Identify")
        .withDescription(
          `Initiate device identification (endpoint: ${name}, id: ${id})`
        )
        .withCategory("config")
        .withEndpoint(name)
    );

    toZigbee.push({
      key: [keyName],
      options: [
        e
          .numeric("identify_timeout", ea.SET)
          .withDescription(
            "Sets the duration of the identification procedure in seconds (1–30, default 3)."
          )
          .withValueMin(1)
          .withValueMax(30),
      ],
      convertSet: async (entity, key, value, meta) => {
        const timeoutVal = meta.options?.identify_timeout ?? 3;
        const ep = entity.getDevice().getEndpoint(id);
        await ep.command(
          "genIdentify",
          "identify",
          { identifytime: timeoutVal },
          getOptions(meta.mapped, ep)
        );
      },
    });
  }

  return { exposes, toZigbee, isModernExtend: true };
}
