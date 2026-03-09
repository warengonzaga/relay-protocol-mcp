import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getIntentStatus } from "../relay-api.js";

export function register(server: McpServer) {
  server.tool(
    "get_transaction_status",
    `Check the status of a Relay bridge or swap transaction by requestId.

Statuses:
  waiting  — The origin chain transaction has been broadcast but not yet confirmed on-chain.
  pending  — The relay network has picked up the request and is processing the cross-chain transfer.
  success  — Complete. Funds have arrived on the destination chain.
  failure  — The transaction failed.
  refund   — The transaction was refunded to the sender.`,
    {
      requestId: z
        .string()
        .describe(
          "The Relay request ID for the transaction to check."
        ),
    },
    async ({ requestId }) => {
      const status = await getIntentStatus(requestId);

      const trackingUrl = `https://relay.link/transaction/${requestId}`;

      let summary: string;
      switch (status.status) {
        case "success":
          summary = `Transaction complete! Destination tx: ${status.txHashes?.join(", ") || "pending confirmation"}.\n\nView on Relay: ${trackingUrl}`;
          break;
        case "pending":
          summary = "Transaction is being processed by the relay network.";
          break;
        case "waiting":
          summary = "Transaction submitted, waiting to be picked up by the relay network.";
          break;
        case "failure":
          summary = "Transaction failed. Check the requestId and try again.";
          break;
        case "refund":
          summary = "Transaction was refunded to the sender.";
          break;
        default:
          summary = `Transaction status: ${status.status}.`;
      }

      return {
        content: [
          { type: "text", text: summary },
          { type: "text", text: JSON.stringify(status, null, 2) },
        ],
      };
    }
  );
}
