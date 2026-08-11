import axios from "axios";

export class AuthConfigurationError extends Error {
  constructor() {
    super("Authentication service is not configured.");
    this.name = "AuthConfigurationError";
  }
}

export function createAuthApiClient() {
  const baseURL = process.env.AUTH_API_URL?.replace(/\/$/, "");
  if (!baseURL) throw new AuthConfigurationError();

  return axios.create({
    baseURL,
    timeout: 10_000,
    headers: { "Content-Type": "application/json" },
  });
}
