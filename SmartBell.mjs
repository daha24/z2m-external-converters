import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import { getEndpointName } from "zigbee-herdsman-converters/lib/utils";
import { bind } from "zigbee-herdsman-converters/lib/reporting";
import { Zcl } from "zigbee-herdsman";

const clst = {
  manuRelayOptions: 0xFCE1,
};

const attr = {
  manuRelayType: 0xFCE2,
  manuRelayCountdown: 0xFCE3,
};

const bell_state = [
  "idle", // 0
  "ringing", // 1
];

export default {
  zigbeeModel: ["SmartBell"],
  model: "SmartBell",
  vendor: "FUNAMI corp. Ltd.",
  description: "Zigbee enabled controller of standard home intercom - bell ringing sensor + open door button",
  ota: true,
  extend: [
    m.deviceEndpoints({ endpoints: { "relay": 1, "sensor": 2 } }),
    m.onOff({
      "endpointNames":["relay"],
      "powerOnBehavior": false,
      "description": "Door open button state (on/off - countdown ALWAYS enforced)",
    }),
    m.numeric({
      name: "countdown",
      label: "Door Open Button Countdown",
      description: "Enforced max duration of door open button active.",
      unit: "s",
      valueMin: 1,
      valueMax: 30,
      valueStep: 1,
      entityCategory: "config",
      endpointNames: ["relay"],
      cluster: clst.manuRelayOptions,
      attribute: { ID: attr.manuRelayCountdown, type: Zcl.DataType.UINT16 },
      access: "ALL",
    }),    
    // m.enumLookup({
    //   name: "bell",
    //   label: "Door Bell State",
    //   description: "",
    //   lookup: {
    //     idle: 0,
    //     ringing: 1,
    //   },
    //   endpointNames: ["sensor"],
    //   cluster: clst.manuRGBMode,
    //   attribute: { ID: attr.rgbMode, type: Zcl.DataType.ENUM8 },
    //   access: "ALL",
    // }),
    m.identify(),
  ],
  meta: { multiEndpoint: true },
  exposes: [],
  configure: async (device, coordinatorEndpoint) => {
    const ep1 = device.getEndpoint(1);
    const ep2 = device.getEndpoint(2);
  },  
};
