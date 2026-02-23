import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { Zcl } from "zigbee-herdsman";
import {
  CLUSTERS,
  ATTR,
  config_map,
  filter_keys,
  identify,
} from "/config/zigbee2mqtt/external_converters/azigbee/config.mjs";

/**
 * Central RGB attribute mapping
 */
const map = {
  mode_type: {
    cluster: CLUSTERS.RGB_LIGHT_MODE,
    attribute: ATTR.RGB_LIGHT_MODE,
    type: Zcl.DataType.ENUM8,
  },
  mode_interval: {
    cluster: CLUSTERS.RGB_LIGHT_MODE,
    attribute: ATTR.RGB_LIGHT_INTERVAL,
    type: Zcl.DataType.UINT16,
  },
};

/**
 * RGB light exposes factory
 *
 * @param {string} endpointName
 * @param {number} endpointID
 * @param {Object} [options]
 * @param {Object} [options.mode] - override/extend effect enum
 * @param {string[]} [keys]
 *
 * available keys: ["light_xy", "light_hs", "mode_type", "mode_interval", "identify"]
 */
export function attributes(endpointName, endpointID, options = {}, keys) {
  const modeLookup = options.mode ?? {
    steady: 0,
    blinking: 1,
    breathing: 2,
    flashing: 3,
    rgb_cycle: 4,
  };

  const all = {
    light_xy: m.light({
      color: {
        modes: ["xy"],
        enhancedHue: false,
      },
      endpointNames: [endpointName],
      effect: false,
      powerOnBehavior: true,
      configureReporting: true,
    }),

    light_hs: m.light({
      color: {
        modes: ["hs"],
        enhancedHue: false,
      },
      endpointNames: [endpointName],
      effect: false,
      powerOnBehavior: true,
      configureReporting: true,
    }),

    mode_type: m.enumLookup({
      name: "effect",
      label: "Options - Mode Type",
      description: "Light mode type when ON (e.g. steady, blinking, ...)",
      lookup: modeLookup,
      endpointName,
      entityCategory: "config",
      cluster: map.mode_type.cluster,
      attribute: {
        ID: map.mode_type.attribute,
        type: map.mode_type.type,
      },
      access: "ALL",
    }),

    mode_interval: m.numeric({
      name: "interval",
      label: "Options - Mode Interval",
      description:
        "Length of light mode effect in ms (not used for steady mode)",
      unit: "ms",
      valueMin: 500,
      valueMax: 60000,
      valueStep: 500,
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.mode_interval.cluster,
      attribute: {
        ID: map.mode_interval.attribute,
        type: map.mode_interval.type,
      },
      access: "ALL",
    }),

    identify: identify({ [endpointName]: endpointID }),
  };

  return filter_keys(all, keys);
}

/**
 * Configure RGB endpoint
 *
 * - Standard light reporting
 * - Manufacturer cluster bind + read
 */
async function configure(device, coordinatorEndpoint, endpointID, keys) {
  await config_map(device, coordinatorEndpoint, endpointID, map, keys);
}

export default {
  attributes,
  configure,
};
