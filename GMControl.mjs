import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import * as e from "zigbee-herdsman-converters/lib/exposes";
import * as r from "zigbee-herdsman-converters/lib/reporting";
import { getEndpointName, assertString, determineEndpoint, getOptions} from "zigbee-herdsman-converters/lib/utils";
import { Zcl } from "zigbee-herdsman";
import { access as ea } from "zigbee-herdsman-converters/lib/exposes";
import { CLUSTERS, ATTR } from "/config/zigbee2mqtt/external_converters/azigbee/defines.mjs";
import CodeInput from "/config/zigbee2mqtt/external_converters/azigbee/codeinput.mjs";

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
  zigbeeModel: ["GMControl"],
  model: "GMControl",
  vendor: "FUNAMI corp. Ltd.",
  description:
    "Composite device to remote control gate motor analog controller CR/34 Serai Mercurio 300 with local code input (external button to open/close garage door IF valid short/long clicks sequence is entered).",
  ota: true,
  extend: [
    m.deviceEndpoints({ endpoints: { gate: 1, codeinput: 2 } }),
    m.enumLookup({
      name: "moving",
      label: "Motor (Endpoint: gate)",
      description: "",
      lookup: {
        IDLE: 0,
        OPENING: 1,
        CLOSING: 2,
      },
      endpointNames: ["gate"],
      cluster: "closuresWindowCovering",
      attribute: "tuyaMovingState",
      access: "STATE_GET",
    }),
    m.occupancy({
      endpointNames: ["gate"],
    }),
    m.windowCovering({
      controls: ["lift"],
      endpointNames: ["gate"],
    }),
    m.binary({
      name: "calibration",
      label: "Calibration",
      description:
        "Set calibration ON, move all down, stop, move all up, stop, set calibration OFF. New calibration time is recorded. ",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointNames: ["gate"],
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
      endpointNames: ["gate"],
      cluster: "closuresWindowCovering",
      attribute: "moesCalibrationTime",
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
      endpointNames: ["gate"],
      cluster: CLUSTERS.WINCOVER_OPTIONS,
      attribute: { ID: ATTR.WINCOVER_WARN_ON_MOVE, type: Zcl.DataType.BOOLEAN },
      access: "ALL",
    }),
    ...CodeInput.attributes("codeinput"),
    identify({ endpoints: [1, 2] }),
  ],
  meta: { multiEndpoint: true },
  configure: async (device, coordinatorEndpoint) => {
    const ep1 = device.getEndpoint(1);
    await ep1.read("genBasic", [
      "modelId",
      "swBuildId",
      "dateCode",
      "powerSource",
    ]);
    await ep1.read(CLUSTERS.WINCOVER_OPTIONS, [ATTR.WINCOVER_WARN_ON_MOVE]);
    await r.bind(ep1, coordinatorEndpoint, [
      "closuresWindowCovering",
      CLUSTERS.WINCOVER_OPTIONS,
    ]);
    await r.currentPositionLiftPercentage(ep1);
    CodeInput.configure(device, coordinatorEndpoint, 2);
  },
};