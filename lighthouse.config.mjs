export const profiles = {
  mobile: {
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      disabled: false,
    },
  },
  desktop: {
    formFactor: "desktop",
    screenEmulation: {
      mobile: false,
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
  },
};
export const pages = { inicio: "/", detalhe: "/nft/042" };
