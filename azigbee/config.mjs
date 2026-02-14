import * as r from "zigbee-herdsman-converters/lib/reporting";

// Custom cluster IDs
export const CLUSTERS = {
  BUTTON_OPTIONS: 0xA000,
  CODEINPUT_OPTIONS: 0xFCC1,
  WINCOVER_OPTIONS: 0xFCD1,
  LIGHT_MODE: 0xFCE2,
  RGB_LIGHT_MODE: 0xA001,
  MEDIA_PLAYER: 0xFCF1,
  RELAY_OPTIONS: 0xFCE1,
};

// Custom attribute IDs
export const ATTR = {
  // Button cluster
  BUTTON_FEEDBACK: 0xA000,
  BUTTON_LONG_PRESS_DELAY: 0xA001,
  BUTTON_FEEDBACK_COLOR: 0xA002,
  BUTTON_FEEDBACK_LEVEL: 0xA003,

  // Code input cluster
  CODEINPUT_CODE: 0xFCC0,
  CODEINPUT_TIMEOUT: 0xFCC1,
  CODEINPUT_LOCKOUT: 0xFCC2,
  CODEINPUT_LOCKOUT_PROGRESSIVE: 0xFCC3,

  // Window covering / gate
  WINCOVER_TUYA_MOVING_STATE: 0xF000,
  WINCOVER_TUYA_CALIBRATION: 0xF001,
  WINCOVER_TUYA_MOTOR_REVERSAL: 0xF002,
  WINCOVER_MOES_CALIBRATION_TIME: 0xF003,
  WINCOVER_WARN_ON_MOVE: 0xFCD0,

  // Light clusters
  LIGHT_MODE: 0xFCE3,
  LIGHT_INTERVAL: 0xFCE4,
  RGB_LIGHT_MODE: 0xA002,
  RGB_LIGHT_INTERVAL: 0xA003,

  // Media player
  MEDIA_PLAYER_STATE: 0xFCF2,
  MEDIA_PLAYER_COMMAND: 0xFCF3,
  MEDIA_PLAYER_VOLUME: 0xFCF4,
  MEDIA_PLAYER_TRACK_COUNT: 0xFCF5,
  MEDIA_PLAYER_CURRENT_TRACK_NUM: 0xFCF6,
  MEDIA_PLAYER_PLAYMODE: 0xFCF7,

  // Relay cluster
  RELAY_TYPE: 0xFCE2,
  RELAY_COUNTDOWN: 0xFCE3,
};

/**
 * Generic configure function for any AZigbee endpoint
 * @param {Object} device - Zigbee device object
 * @param {Object} coordinatorEndpoint - coordinator endpoint
 * @param {number|string} endpointID - endpoint number or name
 * @param {Object} map - mapping of keys to { cluster, attribute }
 * @param {string[]} keys - optional array of keys to configure
 */
export async function config_map(device, coordinatorEndpoint, endpointID, map, keys) {
  const endpoint = device.getEndpoint(endpointID);
  const selectedKeys = keys ?? Object.keys(map);

  const clustersToRead = {};
  const clustersToBind = new Set();

  selectedKeys.forEach((k) => {
    const entry = map[k];
    if (!entry) return;

    clustersToBind.add(entry.cluster);

    // Now attribute is a single value, not an array
    clustersToRead[entry.cluster] = [
      ...(clustersToRead[entry.cluster] ?? []),
      entry.attribute,
    ];
  });

  // Read attributes per cluster
  for (const cluster of Object.keys(clustersToRead)) {
    const clusterId = isNaN(cluster) ? cluster : Number(cluster);
    await endpoint.read(clusterId, clustersToRead[cluster]);
  }

  // Bind clusters
  await r.bind(endpoint, coordinatorEndpoint, Array.from(clustersToBind));
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

