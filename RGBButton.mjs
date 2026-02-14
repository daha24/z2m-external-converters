import * as m from "zigbee-herdsman-converters/lib/modernExtend";
// import * as e from "zigbee-herdsman-converters/lib/exposes";
// import { access as ea } from "zigbee-herdsman-converters/lib/exposes";
import { getEndpointName } from "zigbee-herdsman-converters/lib/utils";
// import { getOptions } from "zigbee-herdsman-converters/lib/utils";
import { bind } from "zigbee-herdsman-converters/lib/reporting";
import { Zcl } from "zigbee-herdsman";
// import { logger } from "zigbee-herdsman-converters/lib/logger";

const clst = {
  manuButtonOptions: 0xa000,
  manuRGBMode: 0xa001,
};

const attr = {
  localFeedback: 0xa000,
  longPressDelay: 0xa001,
  localFeedbackColor: 0xa002,
  localFeedbackLevel: 0xa003,
  rgbMode: 0xa002,
  rgbInterval: 0xa003,
};

const actions = [
  "idle", // 0
  "single", // 1
  "double", // 2
  "long", // 3
];
const names = [
  "none", // 0
  "", // 1
  "button_1", // 2
  "button_2", // 3
  "button_bottom_1", // 4
  "button_bottom_2", // 5
  "button_top_1", // 6
  "button_top_2", // 7
  "button_up", // 8
  "button_down", // 9
  "button_top", // 10
  "button_bottom", // 11
];

/// local extern based on m.text for readonly button action [button_name]_[action_name] via multistate input cluster
function action() {
  const attributeKey = "presentValue";
  const endpointName = "button_actions";
  const base = m.text({
    name: "action",
    label: "Action",
    description: "Button event string [button_name]_[action_name]",
    endpointNames: ["button_actions"],
    cluster: "genMultistateInput",
    attribute: attributeKey,
    access: "STATE_SET",
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
            const event_id = msg.data.presentValue;
            const action_id = event_id % 10;
            const button_id = Math.floor(event_id / 10);
            const action_name = actions[action_id] ?? `action_${action_id}`;
            const button_name = names[button_id] ?? `button_${button_id}`;
            return {
              action: button_name
                ? `${button_name}_${action_name}`
                : action_name,
            };
          }
        },
      },
    ],
  };
}

export default {
  zigbeeModel: ["RGBButton"],
  model: "RGBButton",
  vendor: "FUNAMI corp. Ltd.",
  description: "Composite device with 1-4 buttons (expose action) and 1 RGB LED (expose rgb light)",
  ota: true,
  extend: [
    m.deviceEndpoints({ endpoints: { rgb_light: 1, button_actions: 2 } }),
    action(),
    m.light({
      color: {
        modes: ["xy"],
        enhancedHue: false,
      },
      endpointNames: ["rgb_light"],
      effect: false,
      powerOnBehavior: true,
    }),
    m.enumLookup({
      name: "effect",
      label: "RGB Light Options - Mode",
      description: "Sets RGB light mode (e.g. steady, blinking, ...)",
      lookup: {
        steady: 0,
        blinking: 1,
        breathing: 2,
        flashing: 3,
        rgb_cycle: 4,
      },
      endpointNames: ["rgb_light"],
      cluster: clst.manuRGBMode,
      attribute: { ID: attr.rgbMode, type: Zcl.DataType.ENUM8 },
      access: "ALL",
    }),
    m.numeric({
      name: "rgb_mode_interval",
      label: "RGB Light Options - Interval",
      description: "Length of mode effects in ms (n/a for mode steady)",
      unit: "ms",
      valueMin: 500,
      valueMax: 60000,
      valueStep: 500,
      entityCategory: "config",
      endpointNames: ["rgb_light"],
      cluster: clst.manuRGBMode,
      attribute: { ID: attr.rgbInterval, type: Zcl.DataType.UINT16 },
      access: "ALL",
    }),    
    m.numeric({
      name: "long_press_delay",
      label: "Buttons Options - Long Press Delay",
      description: "Long press delay in ms for all buttons present",
      unit: "ms",
      valueMin: 500,
      valueMax: 5000,
      valueStep: 500,
      entityCategory: "config",
      endpointNames: ["button_actions"],
      cluster: clst.manuButtonOptions,
      attribute: { ID: attr.longPressDelay, type: Zcl.DataType.UINT16 },
      access: "ALL",
    }),
    m.binary({
      name: "feedback",
      label: "Buttons Options - Local Feedback",
      description: "Visual and acoustic local feeback on button press",
      valueOn: ["ON", 1],
      valueOff: ["OFF", 0],
      entityCategory: "config",
      endpointNames: ["button_actions"],
      cluster: clst.manuButtonOptions,
      attribute: { ID: attr.localFeedback, type: Zcl.DataType.BOOLEAN },
      access: "ALL",
    }),
    m.enumLookup({
      name: "feedback_color",
      label: "Buttons Options - Local Feedback Color",
      description: "Sets color of local button feedback",
      lookup: {
        white: 0,
        red: 1,
        green: 2,
        blue: 3,
      },
      endpointNames: ["button_actions"],
      cluster: clst.manuButtonOptions,
      attribute: { ID: attr.localFeedbackColor, type: Zcl.DataType.ENUM8 },
      access: "ALL",
    }),
    m.enumLookup({
      name: "feedback_level",
      label: "Buttons Options - Local Feedback Level",
      description: "Sets level of local button feedback",
      lookup: {
        low: 25,
        medium: 128,
        high: 254,
      },
      endpointNames: ["button_actions"],
      cluster: clst.manuButtonOptions,
      attribute: { ID: attr.localFeedbackLevel, type: Zcl.DataType.ENUM8 },
      access: "ALL",
    }),
    m.identify(),
  ],
  meta: { multiEndpoint: true },
  exposes: [],
  configure: async (device, coordinatorEndpoint) => {
    const ep1 = device.getEndpoint(1);
    await ep1.read("genBasic", ["modelId", "swBuildId", "dateCode", "powerSource"]);
    await ep1.read("genOnOff", ["onOff"]);
    await ep1.read("genLevelCtrl", ["currentLevel"]);
    await ep1.read("lightingColorCtrl", ["currentX", "currentY"]);
    await ep1.read(clst.manuRGBMode, [attr.rgbMode, attr.rgbInterval]);
    await ep1.configureReporting("genOnOff", [
      { attribute: "onOff", minimumReportInterval: 0, maximumReportInterval: 65534, reportableChange: 1 },
    ]);
    await ep1.configureReporting("genLevelCtrl", [
      { attribute: "currentLevel", minimumReportInterval: 0, maximumReportInterval: 65534, reportableChange: 1 },
    ]);
    await ep1.configureReporting("lightingColorCtrl", [
      { attribute: "currentX", minimumReportInterval: 0, maximumReportInterval: 65534, reportableChange: 1 },
      { attribute: "currentY", minimumReportInterval: 0, maximumReportInterval: 65534, reportableChange: 1 },
    ]);
    await bind(ep1, coordinatorEndpoint, [
      clst.manuRGBMode,
    ]);
    const ep2 = device.getEndpoint(2);
    await ep2.read("genMultistateInput", ["presentValue"]);
    await ep2.read(clst.manuButtonOptions, [attr.localFeedback, attr.longPressDelay, attr.localFeedbackColor, attr.localFeedbackLevel]);      
    await bind(ep2, coordinatorEndpoint, [
      "genMultistateInput",
      clst.manuButtonOptions,
    ]);
  },  
};
