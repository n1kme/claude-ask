// USD per 1M tokens.
export interface Rates {
  readonly input: number;
  readonly output: number;
}

export interface ModelPricing extends Rates {
  // Rates that apply once the prompt exceeds `longContextThreshold` tokens.
  readonly longContext?: Rates;
  readonly longContextThreshold?: number;
}

export type PricingTable = Readonly<Record<string, ModelPricing>>;

export interface Defaults {
  readonly model: string;
  readonly maxTokens: number;
}
