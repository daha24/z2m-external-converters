import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { getEndpointName } from "zigbee-herdsman-converters/lib/utils";

/**
 * Creates a read-only multistate action attribute with dedupe.
 * @param {Object} params
 * @param {string} params.endpointName - endpoint to attach to
 * @param {string} params.label - human-readable label
 * @param {string} params.description - description text
 * @param {string} params.name - variable name ("action" for rigid, anything else for dynamic)
 * @param {Object} params.lookup - object mapping value names → ZCL numeric IDs
 *                                 e.g. { idle: 0, input_valid: 1, input_invalid: 2, lockout: 254, unknown: 255 }
 */
export function action(params) {
  const {
    endpointName,
    lookup,
    name = "action",
    label,
    description,
  } = params;

  const attributeKey = "presentValue";

  const base = m.text({
    name,
    endpointName,
    description, // ignored if name="action"
    label,       // ignored by m.text
    cluster: "genMultistateInput",
    attribute: attributeKey,
    access: "STATE_GET",
  });

  // per-endpoint + per-name cache for dedupe
  const lastPublished = new Map(); // key: epKey, value: { val, ts }

  const DEDUPE_MS = 2000; // ignore duplicate events within 1.5s

  return {
    ...base,
    toZigbee: [],
    fromZigbee: [
      {
        cluster: "genMultistateInput",
        type: ["attributeReport"],
        convert: (model, msg, publish, options, meta) => {
          if (!(attributeKey in msg.data)) return;

          // determine endpoint key
          const epRaw = getEndpointName(msg, model, meta);
          const ep = (endpointName || epRaw || "default").toString();
          const epKey = `${name}_${ep}`; // unique key per name + endpoint

          const value_id = msg.data[attributeKey];
          const value_text =
            Object.keys(lookup).find((k) => lookup[k] === value_id) ??
            `${name}_${value_id}`;

          const now = Date.now();
          const last = lastPublished.get(epKey);

          // skip if same value within dedupe window
          if (last && last.val === value_text && now - last.ts < DEDUPE_MS) return;

          // store current value
          lastPublished.set(epKey, { val: value_text, ts: now });

          // decide key to return
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
