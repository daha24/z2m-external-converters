import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import {
  getEndpointName,
  assertString,
} from "zigbee-herdsman-converters/lib/utils";
import * as reporting from "zigbee-herdsman-converters/lib/reporting";
import { Zcl } from "zigbee-herdsman";
import * as e from "zigbee-herdsman-converters/lib/exposes";
import { access as ea } from "zigbee-herdsman-converters/lib/exposes";
import { getOptions } from "zigbee-herdsman-converters/lib/utils";
// import { logger } from "zigbee-herdsman-converters/lib/logger";

const clst = {
  manuCodeInputOptions: 0xfcc1,
  manuWinCoverOptions: 0xfcd1,
};

const attr = {
  code: 0xfcc0, // char[CODEINPUT_MAX_CODE_LENGTH]
  timeout: 0xfcc1, // uint32_t
  lockout: 0xfcc2, // uint32_t
  progressive: 0xfcc3, // bool
  warnOnMove: 0xfcd0, // bool
};

const actions = [
  "idle", // 0
  "input_valid", // 1
  "input_invalid", // 2
];

/// local extern based on m.text for readonly codeinput action via multistate input cluster
function codeInputAction() {
  const attributeKey = "presentValue";
  const endpointName = "codeinput";
  const base = m.text({
    name: "action",
    label: "CodeInput Action",
    description: "Code input action",
    endpointNames: ["codeinput"],
    cluster: "genMultistateInput",
    attribute: attributeKey,
    access: "STATE_SET",
    entityCategory: "config",
  });
  return {
    ...base,
    toZigbee: [], // disable writing
    fromZigbee: [
      {
        cluster: "genMultistateInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
          if (
            attributeKey in msg.data &&
            (!endpointName ||
              getEndpointName(msg, model, meta) === endpointName)
          ) {
            const action_id = msg.data.presentValue;
            const action_name = actions[action_id] ?? `action_${action_id}`;
            return {
              action: action_name,
            };
          }
        },
      },
    ],
  };
}

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
    codeInputAction(),
    m.text({
      name: "code",
      endpointNames: ["codeinput"],
      cluster: clst.manuCodeInputOptions,
      attribute: { ID: attr.code, type: Zcl.DataType.CHAR_STR },
      description:
        "Code sequence for external open/close button (. for short, - for long press, max 8 characters)",
      access: "ALL",
      validate: (value) => {
        assertString(value);
        if (value.length > 8)
          throw new Error("Length of text is greater than 8");
      },
    }),
    m.binary({
      name: "codeinput_state",
      label: "Code input - State",
      description:
        "State of code input (when off, device is has no power, no input is possible)",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      endpointNames: ["codeinput"],
      cluster: "genOnOff",
      attribute: "onOff",
      access: "ALL",
    }),
    m.numeric({
      name: "timeout",
      label: "Code Input - Timeout",
      description: "Time in milliseconds to detect idle state (end of input)",
      unit: "ms",
      valueMin: 500,
      valueMax: 5000,
      valueStep: 500,
      entityCategory: "config",
      endpointNames: ["codeinput"],
      cluster: clst.manuCodeInputOptions,
      attribute: { ID: attr.timeout, type: Zcl.DataType.UINT32 },
      access: "ALL",
    }),

    m.numeric({
      name: "lockout",
      label: "Code Input - Lockout",
      description:
        "Time in milliseconds to lock input after invalid code entered",
      unit: "ms",
      valueMin: 500,
      valueMax: 5000,
      valueStep: 500,
      entityCategory: "config",
      endpointNames: ["codeinput"],
      cluster: clst.manuCodeInputOptions,
      attribute: { ID: attr.lockout, type: Zcl.DataType.UINT32 },
      access: "ALL",
    }),
    m.binary({
      name: "progressive",
      label: "Code Input - Progressive Lockout",
      description:
        "Enable or disable progressive (exponential) lockout after invalid input",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointNames: ["codeinput"],
      cluster: clst.manuCodeInputOptions,
      attribute: { ID: attr.progressive, type: Zcl.DataType.BOOLEAN },
      access: "ALL",
    }),
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

    const ep2 = device.getEndpoint(2);
    await ep2.read("genMultistateInput", ["presentValue"]);
    await ep2.read("genOnOff", ["onOff"]);
    await ep2.read(clst.manuCodeInputOptions, [
      attr.code,
      attr.timeout,
      attr.lockout,
      attr.progressive,
    ]);
    await reporting.bind(ep2, coordinatorEndpoint, [
      "genMultistateInput",
      "genOnOff",
      clst.manuCodeInputOptions,
    ]);
  },
};