import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Transaction, BankAccount } from "@/context/TransactionsContext";

export interface SyncMessage {
  type: "TRANSACTIONS_SYNC" | "ACCOUNTS_SYNC" | "SETTLEMENTS_SYNC" | "REQUEST_SYNC";
  inviteCode: string;
  senderId: string;
  timestamp: number;
  transactions?: Transaction[];
  accounts?: BankAccount[];
  settlements?: Record<string, any>;
}

// Unique client session ID for this browser tab/device to avoid echo loops
const CLIENT_ID =
  typeof window !== "undefined"
    ? window.sessionStorage.getItem("fitduo_client_id") ||
      (() => {
        const id = "client-" + Math.random().toString(36).substring(2, 9);
        try {
          window.sessionStorage.setItem("fitduo_client_id", id);
        } catch {}
        return id;
      })()
    : "server-client";

let activeChannel: any = null;
let activeInviteCode: string | null = null;

/**
 * Connects this device to the shared household room using the 6-character code.
 * Uses Supabase Realtime Broadcast - NO user login or passwords needed.
 */
export function subscribeHouseholdRoom(
  inviteCode: string,
  onRemoteSync: (msg: SyncMessage) => void
) {
  if (typeof window === "undefined" || !inviteCode) return () => {};

  const cleanCode = inviteCode.trim().toUpperCase();

  // If already subscribed to this room, don't recreate
  if (activeChannel && activeInviteCode === cleanCode) {
    return () => {};
  }

  const supabase = getSupabaseBrowserClient();

  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel);
    } catch {}
  }

  activeInviteCode = cleanCode;
  const channelName = `household_room_${cleanCode}`;

  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } },
  });

  channel
    .on("broadcast", { event: "SYNC_EVENT" }, ({ payload }) => {
      if (!payload || payload.senderId === CLIENT_ID) return;
      if (payload.inviteCode !== cleanCode) return;
      onRemoteSync(payload as SyncMessage);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Request latest state from online partner
        channel.send({
          type: "broadcast",
          event: "SYNC_EVENT",
          payload: {
            type: "REQUEST_SYNC",
            inviteCode: cleanCode,
            senderId: CLIENT_ID,
            timestamp: Date.now(),
          },
        });
      }
    });

  activeChannel = channel;

  return () => {
    try {
      supabase.removeChannel(channel);
      if (activeChannel === channel) {
        activeChannel = null;
        activeInviteCode = null;
      }
    } catch {}
  };
}

/**
 * Broadcasts changes to the partner device in real-time behind the scenes.
 */
export async function broadcastHouseholdSync(message: Omit<SyncMessage, "senderId" | "timestamp">) {
  if (typeof window === "undefined") return;

  const cleanCode = (message.inviteCode || "FITDUO").trim().toUpperCase();
  const fullMsg: SyncMessage = {
    ...message,
    inviteCode: cleanCode,
    senderId: CLIENT_ID,
    timestamp: Date.now(),
  };

  // 1. Multi-tab broadcast on same device (BroadcastChannel)
  try {
    if (window.BroadcastChannel) {
      const bc = new BroadcastChannel("cuentaconjunta_transactions_sync");
      bc.postMessage(fullMsg);
      bc.close();
    }
  } catch {}

  // 2. Multi-device cloud broadcast (Supabase Realtime)
  try {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channelName = `household_room_${cleanCode}`;
    const ch = activeChannel || supabase.channel(channelName);

    if (ch.state === "joined") {
      await ch.send({
        type: "broadcast",
        event: "SYNC_EVENT",
        payload: fullMsg,
      });
    } else {
      ch.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          try {
            await ch.send({
              type: "broadcast",
              event: "SYNC_EVENT",
              payload: fullMsg,
            });
          } catch {}
        }
      });
    }
  } catch (err) {
    console.warn("Realtime broadcast send failed:", err);
  }
}
