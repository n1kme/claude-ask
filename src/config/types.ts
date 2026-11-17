export interface AppConfig {
  readonly model: string;
  readonly maxTokens: number;
}

// Per-run overrides (such as CLI flags) that win over the environment.
export type ConfigOverrides = Partial<AppConfig>;

export type Env = Readonly<Record<string, string | undefined>>;
