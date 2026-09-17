import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Error occurred -- missing or invalid svix headers/signature", {
        status: 400,
      });
    }

    try {
      switch (event.type) {
        case "user.created":
        case "user.updated": {
          const { id, first_name, last_name, email_addresses, image_url } =
            event.data;
          const primaryEmail =
            email_addresses && email_addresses.length > 0
              ? email_addresses[0].email_address
              : "";
          const name =
            `${first_name ?? ""} ${last_name ?? ""}`.trim() || undefined;

          await ctx.runMutation(internal.users.syncUser, {
            clerkId: id,
            name,
            email: primaryEmail,
            imageUrl: image_url,
          });
          break;
        }
        case "user.deleted": {
          const { id } = event.data;
          if (id) {
            await ctx.runMutation(internal.users.deleteUser, { clerkId: id });
          }
          break;
        }
      }

      return new Response(null, { status: 200 });
    } catch (err) {
      console.error("Webhook processing error:", err);
      return new Response("Webhook processing failed", { status: 400 });
    }
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payload = await req.text();
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  // In non-production environments without a secret configured, allow unverified payload for testing
  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("CLERK_WEBHOOK_SECRET is not set in production environment");
      return null;
    }
    try {
      return JSON.parse(payload) as WebhookEvent;
    } catch {
      return null;
    }
  }

  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing svix verification headers on webhook request");
    return null;
  }

  const wh = new Webhook(webhookSecret);
  try {
    return wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook signature:", err);
    return null;
  }
}

export default http;
