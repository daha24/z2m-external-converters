import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import * as reporting from "zigbee-herdsman-converters/lib/reporting";
import * as e from "zigbee-herdsman-converters/lib/exposes";
import { Zcl } from "zigbee-herdsman";
import { access as ea } from "zigbee-herdsman-converters/lib/exposes";
import { getOptions } from "zigbee-herdsman-converters/lib/utils";

import { CLUSTERS, ATTR } from "./azigbee/config.mjs";
import CodeInput from "/config/zigbee2mqtt/external_converters/azigbee/codeinput.mjs";

const endpoints = { gate: 1, codeinput: 2 };

const clst = {
  manuWinCoverOptions: 0xfcd1,
};

const attr = {
  warnOnMove: 0xfcd0, // bool
};

export function identify(args) {
  args = args || {};
  let endpoints = args.endpoints;
  if (!endpoints) endpoints = [1];
  const exposes = [];
  const toZigbee = [];

  for (const epID of endpoints) {
    const keyName = `identify_${epID}`;

    exposes.push(
      e
        .enum("identify", ea.SET, ["identify"])
        .withLabel(`Identify`)
        .withDescription("Initiate device identification")
        .withCategory("config")
        .withEndpoint(String(epID))
    );

    toZigbee.push({
      key: [keyName],
      options: [
        e
          .numeric("identify_timeout", ea.SET)
          .withDescription(
            "Sets the duration of the identification procedure in seconds (i.e., how long the device would flash)." +
              "The value ranges from 1 to 30 seconds (default: 3)."
          )
          .withValueMin(1)
          .withValueMax(30),
      ],
      convertSet: async (entity, key, value, meta) => {
        const timeoutVal = meta.options?.identify_timeout ?? 3;
        const ep = entity.getDevice().getEndpoint(epID);
        await ep.command(
          "genIdentify",
          "identify",
          { identifytime: timeoutVal },
          getOptions(meta.mapped, ep)
        );
      },
    });
  }

  return { exposes, toZigbee, isModernExtend: true };
}

export default {
  zigbeeModel: ["GDControl"],
  model: "GDControl",
  vendor: "FUNAMI corp. Ltd.",
  description:
    "Composite device to control garage door with local code input (external button to open/close garage door IF valid short/long clicks sequence is pressed).",
  ota: true,
  extend: [
    m.deviceEndpoints({ endpoints: { wincover: 1, codeinput: 2 } }),
    m.enumLookup({
      name: "moving",
      label: "Moving",
      description: "",
      lookup: {
        IDLE: 0,
        UP: 1,
        DOWN: 2,
      },
      endpointNames: ["wincover"],
      cluster: "closuresWindowCovering",
      attribute: "tuyaMovingState",
      access: "STATE_GET",
    }),
    m.occupancy({
      endpointNames: ["wincover"],
    }),
    m.windowCovering({
      controls: ["lift"],
      endpointNames: ["wincover"],
    }),
    m.binary({
      name: "calibration",
      label: "Calibration",
      description:
        "Set calibration ON, move all down, stop, move all up, stop, set calibration OFF. New calibration time is recorded. ",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointNames: ["wincover"],
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
      endpointNames: ["wincover"],
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
      endpointNames: ["wincover"],
      cluster: "closuresWindowCovering",
      attribute: "tuyaMotorReversal",
      access: "ALL",
    }),
    m.binary({
      name: "warnOnMove",
      label: "Warn On Move",
      description:
        "Enables/disables local warning, when moving (e.g. beep) - if HW exists.",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointNames: ["wincover"],
      cluster: clst.manuWinCoverOptions,
      attribute: { ID: attr.warnOnMove, type: Zcl.DataType.BOOLEAN },
      access: "ALL",
    }),
    ...CodeInput.attributes("codeinput", endpoints.codeinput),
    identify({ endpoints: [1, 2] }),
  ],
  meta: { multiEndpoint: true },
  exposes: [],
  configure: async (device, coordinatorEndpoint) => {
    const ep1 = device.getEndpoint(1);
    await ep1.read("genBasic", [
      "modelId",
      "swBuildId",
      "dateCode",
      "powerSource",
    ]);
    await ep1.read(clst.manuWinCoverOptions, [attr.warnOnMove]);
    await reporting.bind(ep1, coordinatorEndpoint, [
      "closuresWindowCovering",
      clst.manuWinCoverOptions,
    ]);
    await reporting.currentPositionLiftPercentage(ep1);
    await CodeInput.configure(device, coordinatorEndpoint, endpoints.codeinput);
  },
};