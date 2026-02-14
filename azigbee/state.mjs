import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { determineEndpoint, getEndpointName } from "zigbee-herdsman-converters/lib/utils";

/**
 * Creates a binary state attribute for a switch - similar to standard m.onOff but with more configurable options.
 * @param {Object} params - configuration object
 * @param {string} params.endpointName - endpoint to attach to
 * @param {string} params.attributeKey - name of the attribute key
 * @param {string} params.label - human-readable label
 * @param {string} params.description - description text
 * @returns {object} Zigbee2MQTT entity object
 */
export default function state(params) {
  const { endpointName, attributeKey, label, description } = params;
  const cluster = "genOnOff";
  const attribute = "onOff";

  const base = m.binary({
    name: attributeKey,
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
        cluster,
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
