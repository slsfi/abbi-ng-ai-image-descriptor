export type Model = {
  provider: 'OpenAI';
  name: string;
  id: string;
  inputPrice: number;
  outputPrice: number;
  rpm: number;
  reasoning?: string;
  default?: boolean;
};

export type Models = Model[];
