import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import Relay from "/config/zigbee2mqtt/external_converters/azigbee/relay.mjs";
import MultiState from "/config/zigbee2mqtt/external_converters/azigbee/multistate.mjs";

const endpoints = { relay: 1, bell: 2 };

const relayKeys = ["state", "on_time_limited", "off_wait_time", "identify"];

const bellOptions = {
  label: "State",
  description: "Reports bell state via a sensor over the bell contancts",
  lookup: {
    OFF: 0,
    ON: 1,
    UNKNOWN: 255,
  },
};

export default {
  zigbeeModel: ["BellRC"],
  model: "BellRC",
  vendor: "FUNAMI corp. Ltd.",
  description:
    "Zigbee enabled remote controller of home intercom - bell sensor + open door relay with enforced countdown",
  ota: true,

  extend: [
    m.deviceEndpoints({ endpoints }),
    ...Relay.attributes("relay", endpoints.relay, relayKeys),
    ...MultiState.attributes("bell", endpoints.bell, bellOptions),
  ],
  meta: { multiEndpoint: true },
  configure: async (device, coordinatorEndpoint) => {
    await Relay.configure(
      device,
      coordinatorEndpoint,
      endpoints.relay,
      relayKeys
    );
    await MultiState.configure(
      device,
      coordinatorEndpoint,
      endpoints.bell      
    );
  },
};
