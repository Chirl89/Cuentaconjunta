export * from "./database";

export interface UserNames {
  memberA: string;
  memberB: string;
}

export interface VersionInfo {
  version: string;
  conversation?: number;
  iteration?: number;
  updated_at?: string;
}
