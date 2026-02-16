import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import {
  determineEndpoint,
  getEndpointName,
} from "zigbee-herdsman-converters/lib/utils";

/**
 * Creates a binary state attribute for a switch - similar to standard m.onOff but with more configurable options.
 * @param {Object} params - configuration object
 * @param {string} params.endpointName - endpoint to attach to
 * @param {string} params.attributeName - name of the attribute
 * @param {string} params.label - human-readable label
 * @param {string} params.description - description text
 * @returns {object} Zigbee2MQTT entity object
 */
export function state(params) {
  const { endpointName, attributeName, label, description } = params;
  const cluster = "genOnOff";
  const attribute = "onOff";

  const base = m.binary({
    name: attributeName,
    label,
    description,
    valueOn: ["ON", 1],
    valueOff: ["OFF", 0],
    endpointNames: [endpointName],
    cluster,
    attribute,
    access: "ALL",
  });

  return {
    ...base,
    toZigbee: [
      {
        key: [attributeName],
        convertSet: async (entity, key, value, meta) => {
          const ep = determineEndpoint(entity, meta, cluster);
          const v =
            value === "ON" || value === 1 || value === true ? "on" : "off";
          await ep.command(cluster, v, {}, { disableDefaultResponse: true });
          await ep.read(cluster, [attribute]);
          return { [attributeName]: { [attributeName]: value } };
        },
        convertGet: async (entity, key, meta) => {
          const ep = determineEndpoint(entity, meta, cluster);
          const data = await ep.read(cluster, [attribute]);
          return { [attributeName]: data[attribute] ? "ON" : "OFF" };
        },
      },
    ],
    fromZigbee: [
      {
        cluster,
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
          if (getEndpointName(msg, model, meta) !== endpointName) return;
          if (attribute in msg.data) {
            return { [attributeName]: msg.data.onOff ? "ON" : "OFF" };
          }
        },
      },
    ],
  };
}
