import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { getEndpointName } from "zigbee-herdsman-converters/lib/utils";

/**
 * Creates a read-only multistate action attribute.
 * @param {Object} params
 * @param {string} params.endpointName - endpoint to attach to
 * @param {string} params.label - human-readable label
 * @param {string} params.description - description text
 * @param {string[]} params.values - array of possible action values
 * @returns {object} Zigbee2MQTT entity object
 */
export function action(params) {
  const { endpointName, attributeName, label, description, values } = params;
  const attributeKey = "presentValue";
  const base = m.text({
    name: "action", // must be fixed to action
    label,
    description,
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
            const action_id = msg.data[attributeKey];
            const action_name = values[action_id] ?? `action_${action_id}`;
            return { action: action_name }; // must be fixed to action
          }
        },
      },
    ],
  };
}