// Fixture model for tests/ — illustrative shape only.
// The real Swamp model API (metadata, arguments, methods, inputs) should be
// confirmed against `swamp extension init` output and current docs before use.

export const metadata = {
  name: "example",
  description: "Typed wrapper around a fictional examplectl CLI",
};

export const arguments = {
  host: { type: "string", required: true },
  token: { type: "vault_ref", required: true, description: "example host token" },
};

export const methods = {
  status: {
    inputs: {},
    run: async (_instance, _inputs) => {
      throw new Error("fixture only — implement against the real model API");
    },
  },
  apply: {
    inputs: { config: "string", dry_run: "boolean" },
    run: async (_instance, _inputs) => {
      throw new Error("fixture only — implement against the real model API");
    },
  },
};

export const inputs = ["host", "token"] as const;
