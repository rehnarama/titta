import { Repo } from "@automerge/automerge-repo";
import { WebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

const indexedDbStorageAdapter = new IndexedDBStorageAdapter();
const websocketNetworkAdapter = new WebSocketClientAdapter(
  "wss://sync.automerge.org",
);

export const repo = new Repo({
  storage: indexedDbStorageAdapter,
  network: [websocketNetworkAdapter],
});
