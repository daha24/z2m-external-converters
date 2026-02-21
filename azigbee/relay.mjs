import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { Zcl } from "zigbee-herdsman";
import {
  config_map,
  filter_keys,
  identify,
  CLUSTERS,
  ATTR,
} from "/config/zigbee2mqtt/external_converters/azigbee/config.mjs";

/**
 * Central mapping of attribute keys to clusters and attributes
 */
const map = {
  state: {
    cluster: null, // handled by m.onOff
  },
  on_time: {
    cluster: CLUSTERS.RELAY_OPTIONS,
    attribute: ATTR.RELAY_ON_TIME,
    type: Zcl.DataType.UINT16,
  },
  off_wait_time: {
    cluster: CLUSTERS.RELAY_OPTIONS,
    attribute: ATTR.RELAY_OFF_WAIT_TIME,
    type: Zcl.DataType.UINT16,
  },
  type: {
    cluster: CLUSTERS.RELAY_OPTIONS,
    attribute: ATTR.RELAY_TYPE,
    type: Zcl.DataType.ENUM8,
  },
};

/**
 * Returns relay exposes, optionally filtered by keys.
 * Implements exclusive logic for two different on-time exposes:
 * 
 * - `on_time` (0–360s) – general on-time used by default.
 * - `on_time_limited` (1–15s) – narrow range for special devices; device enforces limits.
 *
 * Exclusivity rules:
 * - `keys` undefined → only `on_time` is exposed.
 * - `keys` includes both `on_time` and `on_time_limited` → `on_time` used, `on_time_limited` ignored.
 * - `keys` includes only `on_time` → `on_time` used.
 * - `keys` includes only `on_time_limited` → `on_time_limited` used.
 *
 * Other keys: `off_wait_time`, `type`, `state`, `identify`.
 * 
 * @param {string} endpointName - endpoint name for Z2M
 * @param {integer} endpointID - endpoint ID
 * @param {string[]} keys - optional array of keys to include
 *                          available keys ["state", "type", "on_time", "on_time_limited", "off_wait_time", "identify"]
 */
function attributes(endpointName, endpointID, keys) {
  const all = {
    state: m.onOff({
      endpointNames: [endpointName],
      description: `On/off state of the relay`,
      powerOnBehavior:
        keys === undefined || keys.includes("power_on_behaviour"),
    }),
    on_time: m.numeric({
      name: "on_countdown", // we must rename ontime to avoid probably unappropriate genOnOff convertor validation
      label: "Relay On Time",
      description:
        "Time [s] until the relay switches off automatically (0 = no on-time limit)",
      unit: "s",
      valueMin: 0,
      valueMax: 360,
      valueStep: 1,
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.on_time.cluster,
      attribute: { ID: map.on_time.attribute, type: map.on_time.type },
      access: "ALL",
    }),
    // [2026-02-20 01:26:12] error: 	z2m: Publish 'set' 'on_time' to 'Bell' failed: 'Error: 'null' not allowed, choose between: toggle,off,on'
    on_time_limited: m.numeric({
      name: "on_countdown", // we must rename ontime to avoid probably unappropriate genOnOff convertor validation
      label: "Relay On Time (Limited)",
      description:
        "Time [s] until the relay switches off automatically (device enforces 1–15 s)",
      unit: "s",
      valueMin: 1,
      valueMax: 15,
      valueStep: 1,
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.on_time.cluster,
      attribute: { ID: map.on_time.attribute, type: map.on_time.type },
      access: "ALL",
    }),
    off_wait_time: m.numeric({
      name: "off_wait_time_",
      label: "Relay Off Wait Time",
      description:
        "Time [s] to wait after turning off before it can be triggered again (0 = no off-wait-time limit)",
      unit: "s",
      valueMin: 0,
      valueMax: 360,
      valueStep: 1,
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.off_wait_time.cluster,
      attribute: { ID: map.off_wait_time.attribute, type: map.off_wait_time.type },
      access: "ALL",
    }),
    type: m.enumLookup({
      name: "type",
      label: `Relay Switch Type`,
      lookup: {
        toggle: 0,
        state: 1,
        momentary: 2,
      },
      endpointName,
      cluster: map.type.cluster,
      attribute: { ID: map.type.attribute, type: map.type.type },
      entityCategory: "config",
      access: "ALL",
      description: "Defines the relay behavior (toggle, state, momentary)",
    }),
    identify: identify({ [endpointName]: endpointID }),
  };
  if (!keys || keys.includes("on_time") || (keys.includes("on_time") && keys.includes("on_time_limited"))) {
    delete all.on_time_limited;
  } else if (keys.includes("on_time_limited") && !keys.includes("on_time")) {
    delete all.on_time;
  }  
  return filter_keys(all, keys);
}

/**
 * Configure relay endpoint
 * Only bind/report the clusters necessary for the selected keys
 */
async function configure(device, coordinatorEndpoint, endpointID, keys) {
  await config_map(device, coordinatorEndpoint, endpointID, map, keys);
}

export default {
  attributes,
  configure,
};
