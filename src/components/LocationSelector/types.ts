export interface LocationData {
  province: string;
  city: string;
  district: string;
  lon: number;
  lat: number;
}

export interface LocationTree {
  provinces: {
    [key: string]: {
      name: string;
      cities: {
        [key: string]: {
          name: string;
          districts: {
            [key: string]: {
              name: string;
              lon: number;
              lat: number;
            };
          };
        };
      };
    };
  };
}

export interface SearchIndex {
  [key: string]: LocationData[];
}

export interface SelectedLocation {
  province: string;
  city: string;
  district: string;
  lon: number;
  lat: number;
}