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
  moving: {
    cluster: "closuresWindowCovering",
    attribute: "tuyaMovingState",
    type: Zcl.DataType.UINT8,
  },
  occupancy: {
    cluster: null, // handled by m.occupancy
  },
  windowCovering: {
    cluster: null, // handled by m.windowCovering
  },
  calibration: {
    cluster: "closuresWindowCovering",
    attribute: "tuyaCalibration",
    type: Zcl.DataType.BOOLEAN,
  },
  calibration_time: {
    cluster: "closuresWindowCovering",
    attribute: "moesCalibrationTime",
    type: Zcl.DataType.UINT8,
  },
  warnOnMove: {
    cluster: CLUSTERS.WINCOVER_OPTIONS,
    attribute: ATTR.WINCOVER_WARN_ON_MOVE,
    type: Zcl.DataType.BOOLEAN,
  },
};

/*
TODO
- [ ] add option to pass moving name/values - motor/ shutter / gate
- [ ] add wincover other attributes as UP/DOWN, lift/tilt etc. - this code reflects special GateRC implementation
*/

/**
 * Returns wincover exposes, optionally filtered by keys
 * @param {string} endpointName
 * @param {integer} endpointID
 * @param {string[]} keys - optional array of keys to include
 *                          available keys: ["moving", "occupancy", "windowCovering", "calibration", "calibration_time", "warnOnMove", "identify"]
 */
export function attributes(endpointName, endpointID, keys) {
  const all = {
    moving: m.enumLookup({
      name: "moving",
      label: `Motor (Endpoint: ${endpointName})`,
      description: "",
      lookup: {
        IDLE: 0,
        OPENING: 1,
        CLOSING: 2,
      },
      endpointNames: [endpointName],
      cluster: map.moving.cluster,
      attribute: map.moving.attribute,
      access: "STATE_GET",
    }),
    occupancy: m.occupancy({
      endpointNames: [endpointName],
    }),
    windowCovering: m.windowCovering({
      controls: ["lift"],
      endpointNames: [endpointName],
    }),
    calibration: m.binary({
      name: "calibration",
      label: "Calibration",
      description:
        "Set calibration ON, move all down, stop, move all up, stop, set calibration OFF. New calibration time is recorded.",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.calibration.cluster,
      attribute: map.calibration.attribute,
      access: "ALL",
    }),
    calibration_time: m.numeric({
      name: "calibration_time",
      label: "Calibration time",
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
    warnOnMove: m.binary({
      name: "warnOnMove",
      label: "Warn On Move",
      description:
        "Enables/disables local warning, when moving (e.g. beep) - if HW exists.",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointNames: [endpointName],
      cluster: map.warnOnMove.cluster,
      attribute: { ID: map.warnOnMove.attribute, type: map.warnOnMove.type },
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
