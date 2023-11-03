export interface IZoneList {
  name: string;
  status: string;
  nameServers: [string];
  currentNameServers: [string];
  lastCheckAt: string;
  createdAt: string;
}

export interface IZones {
  data: IZoneList[];
}

export interface IZoneGet {
  status: string;
  data: {
    name: string;
    status: string;
    nameServers: [string];
    currentNameServers: [string];
    lastCheckAt: string;
    createdAt: string;
  };
}
