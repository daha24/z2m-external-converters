import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { getEndpointName } from "zigbee-herdsman-converters/lib/utils";

/**
 * Creates a read-only multistate action attribute with optional button-name mapping and dedupe.
 *
 * @param {Object} params
 * @param {string} params.endpointName - endpoint to attach to
 * @param {string} params.name - variable name ("action" for standard, anything else for dynamic)
 * @param {Object} params.actions - object mapping action captions → ZCL numeric IDs
 *                                  e.g. { idle: 0, single: 1, double: 2, long: 3 }
 * @param {string} [params.label] - human-readable label
 * @param {string} [params.description] - description text
 * @param {Object} [params.buttons] - optional object mapping buttons captions → IDs
 *                                     e.g. { button_1: 2, button_2: 3 }
 *                                     if set, returned value is "[button_name]_[action_name]"
 *                                     if NOT set, returned value is "[action_name]"
 */
export function action(params) {
  const {
    endpointName,
    actions,
    name = "action",
    label,
    description,
    buttons = null,
  } = params;

  const attributeKey = "presentValue";

  const base = m.text({
    name,
    endpointName,
    label,
    description,
    cluster: "genMultistateInput",
    attribute: attributeKey,
    access: "STATE_GET",
  });

  const lastPublished = new Map();
  const DEDUPE_MS = 2000;

  return {
    ...base,
    toZigbee: [],
    fromZigbee: [
      {
        cluster: "genMultistateInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
          if (!(attributeKey in msg.data)) return;

          const epRaw = getEndpointName(msg, model, meta);
          const ep = (endpointName || epRaw || "default").toString();
          const epKey = `${name}_${ep}`;

          const value_id = msg.data[attributeKey];

          let action_name;
          let value_text;

          if (buttons) {
            // [button_name]_[action_name]
            const action_id = value_id % 10;
            const button_id = Math.floor(value_id / 10);
            action_name =
              Object.keys(actions).find((k) => actions[k] === action_id) ??
              `action${action_id}`;
            if (action_id === 0) {
              // if idle (0), omit button name
              value_text = action_name;
            } else if (button_id === 1) {
              // if single button (1), omit button name
              value_text = action_name;
            } else {
              const button_name =
                Object.keys(buttons).find((k) => buttons[k] === button_id) ??
                `button_${button_id}`;
              value_text = `${button_name}_${action_name}`;
            }
          } else {
            // [action_name]
            action_name =
              Object.keys(actions).find((k) => actions[k] === value_id) ??
              `action${value_id}`;
            value_text = action_name;
          }

          const now = Date.now();
          const last = lastPublished.get(epKey);
          if (last && last.val === value_text && now - last.ts < DEDUPE_MS)
            return;

          lastPublished.set(epKey, { val: value_text, ts: now });

          const value_key =
            name === "action"
              ? "action"
              : endpointName
              ? `${name}_${endpointName}`
              : name;
          return { [value_key]: value_text };
        },
      },
    ],
  };
}
