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
 *
 * This function builds all modernExtend exposes for a wincover endpoint.
 * Both `endpointName` and `endpointID` are optional for single-endpoint devices.
 *
 * @param {Object}   [params] - Options object.
 * @param {string}   [params.endpointName] - Name of the endpoint.
 * @param {number}   [params.endpointID=1] - Endpoint ID (defaults to 1 for single-endpoint devices).
 * @param {Object}   [params.lookup] - Override/extend enum values for activity expose.
 * @param {string[]} [params.controls] - Array of windowCovering controls, e.g. ["lift", "tilt"].
 * @param {string[]} [params.keys] - Optional array of keys to include.
 *                                    Available keys: ["activity", "obstruction", "controls", "calibration_mode", "calibration_time", "motor_reversal", "warn_on_move", "identify"]
 *
 * @example
 * // Single-endpoint default
 * attributes({ keys: ["activity", "controls"] });
 *
 * @example
 * // Multi-endpoint
 * attributes({ endpointName: "roller", endpointID: 2, keys: ["activity", "controls"] });
 */
export function attributes({
  endpointName = null,
  endpointID = 1,
  lookup = {
    IDLE: 0,
    UP: 1,
    DOWN: 2,
    UNKNOWN: 255,
  },
  controls = ["lift"],
  keys,
} = {}) {
  const all = {
    activity: m.enumLookup({
      name: "activity",
      label: "Activity",
      description: "",
      lookup: lookup,
      cluster: map.activity.cluster,
      attribute: map.activity.attribute,
      access: "STATE_GET",
      ...(endpointName && { endpointName }),
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
      cluster: map.obstruction.cluster,
      attribute: { ID: map.obstruction.attribute, type: map.obstruction.type },
      access: "STATE_GET",
      ...(endpointName && { endpointName }),
    }),

    controls: m.windowCovering({
      controls,
      ...(endpointName && { endpointNames: [endpointName] }),
    }),

    calibration_mode: m.binary({
      name: "calibration_mode",
      label: "Calibration Mode",
      description:
        "Set calibration ON, move all down, stop, move all up, stop, set calibration OFF. New calibration time is recorded.",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      cluster: map.calibration_mode.cluster,
      attribute: map.calibration_mode.attribute,
      access: "ALL",
      ...(endpointName && { endpointName }),
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
      cluster: map.calibration_time.cluster,
      attribute: map.calibration_time.attribute,
      access: "ALL",
      ...(endpointName && { endpointNames: [endpointName] }),
    }),

    motor_reversal: m.binary({
      name: "motor_reversal",
      label: "Motor Reversal",
      description: "",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      cluster: map.motor_reversal.cluster,
      attribute: map.motor_reversal.attribute,
      access: "ALL",
      ...(endpointName && { endpointName }),
    }),

    warn_on_move: m.binary({
      name: "warn_on_move",
      label: "Warn On Move",
      description:
        "Enables/disables local warning when moving (e.g. beep) - if hardware implements it.",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      cluster: map.warn_on_move.cluster,
      attribute: {
        ID: map.warn_on_move.attribute,
        type: map.warn_on_move.type,
      },
      access: "ALL",
      ...(endpointName && { endpointName }),
    }),

    identify: endpointName
      ? identify({ [endpointName]: endpointID })
      : identify(),
  };

  return filter_keys(all, keys);
}

/**
 * Configure a wincover endpoint
 *
 * This function reads and binds only the clusters needed for the specified keys,
 * and initializes the lift percentage for the endpoint.
 *
 * @param {Object} device - The Zigbee device object.
 * @param {Object} coordinatorEndpoint - The coordinator endpoint object.
 * @param {Object} [params] - Optional parameters.
 * @param {number} [params.endpointID=1] - The endpoint ID to configure. Defaults to 1 for single-endpoint devices.
 * @param {string[]} [params.keys] - Array of attribute keys to configure, e.g., ["activity", "controls", "calibration_mode"].
 *
 * @example
 * // Single-endpoint device (uses default endpoint 1)
 * await configure(device, coordinatorEndpoint, { keys: ["activity", "controls"] });
 *
 * @example
 * // Multi-endpoint device
 * await configure(device, coordinatorEndpoint, { endpointID: 2, keys: ["activity", "controls"] });
 */
async function configure(
  device,
  coordinatorEndpoint,
  { endpointID = 1, keys } = {}
) {
  await config_map(device, coordinatorEndpoint, endpointID, map, keys);
  const ep = device.getEndpoint(endpointID);
  await r.currentPositionLiftPercentage(ep);
}

export default {
  attributes,
  configure,
};
