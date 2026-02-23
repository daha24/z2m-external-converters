import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { Zcl } from "zigbee-herdsman";
import {
  CLUSTERS,
  ATTR,
  config_map,
  filter_keys,
  identify,
} from "/config/zigbee2mqtt/external_converters/azigbee/config.mjs";
import { action } from "./action.mjs";

/**
 * Central mapping of button attributes
 */
const map = {
  long_press_delay: {
    cluster: CLUSTERS.BUTTON_OPTIONS,
    attribute: ATTR.BUTTON_LONG_PRESS_DELAY,
    type: Zcl.DataType.UINT16,
  },
  feedback: {
    cluster: CLUSTERS.BUTTON_OPTIONS,
    attribute: ATTR.BUTTON_FEEDBACK,
    type: Zcl.DataType.ENUM8,
  },
  feedback_color: {
    cluster: CLUSTERS.BUTTON_OPTIONS,
    attribute: ATTR.BUTTON_FEEDBACK_COLOR,
    type: Zcl.DataType.ENUM8,
  },
  feedback_level: {
    cluster: CLUSTERS.BUTTON_OPTIONS,
    attribute: ATTR.BUTTON_FEEDBACK_LEVEL,
    type: Zcl.DataType.ENUM8,
  },
};

/**
 * Button exposes factory
 *
 * @param {string} endpointName
 * @param {number} endpointID
 * @param {Object} [options]
 * @param {Object} [options.feedback] - optional lookup object for feedback
 * @param {Object} [options.actions] - optional lookup object for actions
 * @param {Object} [options.buttons] - optional lookup object for buttons
 * @param {string[]} [keys]
 */
export function attributes(endpointName, endpointID, options = {}, keys) {
  const feedbackLookup = options.feedback ?? {
    none: 0,
    visual: 1,
    haptic: 2,
    "visual+haptic": 3,
  };
  const actionsLookup = options.actions ?? {
    idle: 0,
    single: 1,
    double: 2,
    long: 3,
  };
  const buttonsLookup = options.buttons ?? {
    button: 1,
    button_1: 2,
    button_2: 3,
    button_bottom_1: 4,
    button_bottom_2: 5,
    button_top_1: 6,
    button_top_2: 7,
    button_up: 8,
    button_down: 9,
    button_top: 10,
    button_bottom: 11,
  };

  const all = {
    action: action({
      endpointName,
      name: "action",
      label: "Action",
      description: "Button event constructed as [button]_[action] string",
      actions: actionsLookup,
      buttons: buttonsLookup,
    }),

    long_press_delay: m.numeric({
      name: "long_press_delay",
      label: "Button Options - Long Press Delay",
      description: "Long press delay in ms for all buttons present",
      unit: "ms",
      valueMin: 500,
      valueMax: 5000,
      valueStep: 500,
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.long_press_delay.cluster,
      attribute: {
        ID: map.long_press_delay.attribute,
        type: map.long_press_delay.type,
      },
      access: "ALL",
    }),

    feedback: m.enumLookup({
      name: "feedback",
      label: "Button Options - Local Feedback Type",
      description: "Sets type of local button feedback",
      lookup: feedbackLookup,
      endpointName,
      cluster: map.feedback.cluster,
      attribute: { ID: map.feedback.attribute, type: map.feedback.type },
      access: "ALL",
    }),

    feedback_color: m.enumLookup({
      name: "feedback_color",
      label: "Button Options - Local Feedback Color",
      description: "Sets color of local button feedback",
      lookup: {
        white: 0,
        red: 1,
        green: 2,
        blue: 3,
      },
      endpointName,
      cluster: map.feedback_color.cluster,
      attribute: {
        ID: map.feedback_color.attribute,
        type: map.feedback_color.type,
      },
      access: "ALL",
    }),

    feedback_level: m.enumLookup({
      name: "feedback_level",
      label: "Button Options - Local Feedback Level",
      description: "Sets level of local button feedback",
      lookup: {
        low: 25,
        medium: 128,
        high: 254,
      },
      endpointName,
      cluster: map.feedback_level.cluster,
      attribute: {
        ID: map.feedback_level.attribute,
        type: map.feedback_level.type,
      },
      access: "ALL",
    }),

    identify: identify({ [endpointName]: endpointID }),
  };

  return filter_keys(all, keys);
}

/**
 * Configure button endpoint
 *
 * - Binds and reads button cluster attributes
 */
export async function configure(device, coordinatorEndpoint, endpointID, keys) {
  await config_map(device, coordinatorEndpoint, endpointID, map, keys);
}

export default {
  attributes,
  configure,
};
