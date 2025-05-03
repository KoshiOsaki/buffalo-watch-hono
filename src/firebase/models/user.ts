import type { DocumentBase } from "./base.js";

export type User = DocumentBase & {
  id: string; // slackUserId
  name: string; // 不要かも
  deviceList: Device[];
};

export type Device = {
  type: DeviceType;
  name: string;
  macAddress: string;
};

export type DeviceType = "PC" | "iPhone";
