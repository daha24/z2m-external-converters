import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import {
  filter_keys,
  identify,
  config_map
} from "/config/zigbee2mqtt/external_converters/azigbee/config.mjs";

/**
 * Central mapping of attribute keys to clusters and attributes
 * Used in both attributes() and configure()
 */
const map = {
  state: {
    cluster: "genMultistateInput",
    attribute: "presentValue",
  },
};

/**
 * Returns enum sensor exposes
 * @param {string} endpointName - endpoint name in Z2M
 * @param {integer} endpointID - endpoint ID
 * @param {Object} [options={}] - configuration object
 * @param {string} [options.label="Sensor State"] - human-readable label
 * @param {string} [options.description="Generic enum sensor"] - description
 * @param {Object} [options.lookup={STATE_0: 0, STATE_1: 1}] - enum mapping (key -> value)
 * @param {boolean} [options.readonly=true] - if true, expose as STATE only
 * @param {string[]} keys - optional array of keys to include
 *                          available keys ["state", "identify"]
 */
export function attributes(endpointName, endpointID, options = {}, keys) {
  const opts = {
    label: "Sensor State",
    description: "Generic enum sensor",
    lookup: { OFF: 0, ON: 1 },
    readonly: true,
    ...options,
  };
  const accessType = opts.readonly ? "STATE_GET" : "ALL";
  const all = {
    state: m.enumLookup({
      name: "state",
      label: opts.label,
      description: opts.description,
      lookup: opts.lookup,
      endpointName,
      cluster: "genMultistateInput",
      attribute: "presentValue",
      access: accessType,
      reporting: {
        min: 0,
        max: 65000,
        change: 0,
      },
    }),
    identify: identify({ [endpointName]: endpointID }),
  };
  return filter_keys(all, keys);
}
/**
 * Configure enum sensor endpoint
 * Optionally bind/report clusters if device supports it
 */
async function configure(
  device,
  coordinatorEndpoint,
  endpointID,
  keys
) {
    await config_map(device, coordinatorEndpoint, endpointID, map, keys);
}

export default {
  attributes,
  configure,
};
