import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import * as exposes from "zigbee-herdsman-converters/lib/exposes";
import * as reporting from "zigbee-herdsman-converters/lib/reporting";

const e = exposes.presets;
const ea = exposes.access;

export default {
  zigbeeModel: ["SMLControl"],
  model: "SMLControl",
  vendor: "FUNAMI corp. Ltd.",
  description: "Velux SML Rolershade Control Device",
  extend: [
    m.enumLookup({
      name: "moving",
      label: "Moving",
      description: "",
      lookup: {
        IDLE: 0,
        UP: 1,
        DOWN: 2,
      },
      endpoint: 1,
      cluster: "closuresWindowCovering",
      attribute: "tuyaMovingState",
      access: "STATE_GET",
    }),
    m.windowCovering({ controls: ["lift"] }),
    m.identify(),
    m.binary({
      name: "calibration",
      label: "Calibration",
      description: "Set calibration ON, move all down, stop, move all up, stop, set calibration OFF. New calibration time is recorded. ",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpoint: 1,
      cluster: "closuresWindowCovering",
      attribute: "tuyaCalibration",
      access: "ALL",
    }),
    m.numeric({
      name: "calibration_time",
      label: "Calibration time",
      description: "",
      unit: "s",
      valueMin: 0,
      valueMax: 120,
      valueStep: 1,
      entityCategory: "config",
      endpoint: 1,
      cluster: "closuresWindowCovering",
      attribute: "moesCalibrationTime",
      access: "ALL",
    }),
    m.binary({
      name: "motor_reversal",
      label: "Motor reversal",
      description: "",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpoint: 1,
      cluster: "closuresWindowCovering",
      attribute: "tuyaMotorReversal",
      access: "ALL",
    }),
  ],
  meta: {},
  exposes: [],
  configure: async (device, coordinatorEndpoint) => {
    const endpoint = device.getEndpoint(1);
    await endpoint.read("genBasic", [
      "modelId",
      "swBuildId",
      "dateCode",
      "powerSource",
    ]);
    await reporting.bind(endpoint, coordinatorEndpoint, [
      "closuresWindowCovering",
    ]);
    await reporting.currentPositionLiftPercentage(endpoint);
  },
};
