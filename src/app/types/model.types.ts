export type Model = {
  provider: string;
  name: string;
  id: string;
  inputPrice: number;
  outputPrice: number;
  rpm: number;
  default?: boolean;
};

export type Models = Model[];
