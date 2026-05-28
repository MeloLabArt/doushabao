export type ModelEndpoint = {
  host: string;
  key: string;
  model: string;
};

/** Runtime API config; analysis and edit may use different providers. */
export type Config = {
  analysis: ModelEndpoint;
  edit: ModelEndpoint;
};
