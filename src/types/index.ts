export type Ownership = "USER_A" | "USER_B" | "JOINT";

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
