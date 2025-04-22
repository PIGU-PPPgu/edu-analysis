
export interface PredefinedProvider {
  id: string;
  name: string;
  versions: string[];
}

export interface CustomProvider {
  id: string;
  name: string;
  endpoint: string;
}
