import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import * as r from "zigbee-herdsman-converters/lib/reporting";
import { Zcl } from "zigbee-herdsman";
import {
  config_map,
  filter_keys,
  identify,
  CLUSTERS,
  ATTR,
} from "/config/zigbee2mqtt/external_converters/azigbee/config.mjs";

/**
 * Central mapping of wincover attribute keys to clusters, attributes, and types
 */
const map = {
  activity: {
    cluster: "closuresWindowCovering",
    attribute: "tuyaMovingState",
    type: Zcl.DataType.UINT8,
  },
  obstruction: {
    cluster: CLUSTERS.WINCOVER_OPTIONS,
    attribute: ATTR.WINCOVER_OBSTRUCTION_SENSOR,
    type: Zcl.DataType.ENUM8,
  },
  windowCovering: {
    cluster: null, // handled by m.windowCovering
  },
  calibration_mode: {
    cluster: "closuresWindowCovering",
    attribute: "tuyaCalibration",
    type: Zcl.DataType.BOOLEAN,
  },
  calibration_time: {
    cluster: "closuresWindowCovering",
    attribute: "moesCalibrationTime",
    type: Zcl.DataType.UINT8,
  },
  motor_reversal: {
    cluster: "closuresWindowCovering",
    attribute: "tuyaMotorReversal",
    type: Zcl.DataType.BOOLEAN,
  },
  warn_on_move: {
    cluster: CLUSTERS.WINCOVER_OPTIONS,
    attribute: ATTR.WINCOVER_WARN_ON_MOVE,
    type: Zcl.DataType.BOOLEAN,
  },
};

/**
 * Returns wincover exposes, optionally filtered by keys
 * @param {string} endpointName
 * @param {integer} endpointID
 * @param {Object} [options] - optional overrides for exposes
 * @param {Object} [options.lookup] - override/extend enum values for activity expose
 * @param {string[]} [options.controls] - array of windowCovering controls, e.g. ["lift", "tilt"]
 * @param {string[]} [keys] - optional array of keys to include
 *                             available keys: ["activity", "obstruction", "controls", "calibration_mode", "calibration_time", "motor_reversal", "warn_on_move", "identify"]
 */
export function attributes(endpointName, endpointID, options = {}, keys) {
  
  const activityLookup = {
    IDLE: 0,
    UP: 1,
    DOWN: 2,
    UNKNOWN: 255,
    ...(options.lookup || {}),
  };
  const wincoverControls = options.controls || ["lift"];

  const all = {
    activity: m.enumLookup({
      name: "activity",
      label: "Activity",
      description: "",
      lookup: activityLookup,
      endpointName,
      cluster: map.activity.cluster,
      attribute: map.activity.attribute,
      access: "STATE_GET",
    }),

    obstruction: m.enumLookup({
      name: "obstruction",
      label: "Obstruction",
      description: "",
      lookup: {
        CLEAR: 0,
        BLOCKED: 1,
        UNKNOWN: 255,
      },
      endpointName,
      cluster: map.obstruction.cluster,
      attribute: { ID: map.obstruction.attribute, type: map.obstruction.type },
      access: "STATE_GET",
    }),

    controls: m.windowCovering({
      controls: wincoverControls,
      endpointNames: [endpointName],
    }),

    calibration_mode: m.binary({
      name: "calibration_mode",
      label: "Calibration Mode",
      description:
        "Set calibration ON, move all down, stop, move all up, stop, set calibration OFF. New calibration time is recorded.",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointName,
      cluster: map.calibration_mode.cluster,
      attribute: map.calibration_mode.attribute,
      access: "ALL",
    }),

    calibration_time: m.numeric({
      name: "calibration_time",
      label: "Calibration Time",
      description: "",
      unit: "s",
      valueMin: 0,
      valueMax: 120,
      valueStep: 1,
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.calibration_time.cluster,
      attribute: map.calibration_time.attribute,
      access: "ALL",
    }),

    motor_reversal: m.binary({
      name: "motor_reversal",
      label: "Motor Reversal",
      description: "",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointName,
      cluster: map.motor_reversal.cluster,
      attribute: map.motor_reversal.attribute,
      access: "ALL",
    }),

    warn_on_move: m.binary({
      name: "warn_on_move",
      label: "Warn On Move",
      description:
        "Enables/disables local warning when moving (e.g. beep) - if hardware implements it.",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointName,
      cluster: map.warn_on_move.cluster,
      attribute: {
        ID: map.warn_on_move.attribute,
        type: map.warn_on_move.type,
      },
      access: "ALL",
    }),

    identify: identify({ [endpointName]: endpointID }),
  };

  return filter_keys(all, keys);
}

/**
 * Configure wincover endpoint
 * Reads & binds only the clusters needed for the specified keys
 * and initializes lift percentage
 */
async function configure(device, coordinatorEndpoint, endpointID, keys) {
  await config_map(device, coordinatorEndpoint, endpointID, map, keys);
  const ep = device.getEndpoint(endpointID);
  await r.currentPositionLiftPercentage(ep);
}

export default {
  attributes,
  configure,
};
