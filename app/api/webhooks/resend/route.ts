import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { EmailStatus, Prisma } from "@prisma/client";

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    created_at: string;
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    status?: string;
    bounce?: {
      message: string;
      subType: string;
      type: string;
    };
  };
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim() || null;

  try {
    // 1. Read raw text body for cryptographic signature verification
    const rawBody = await req.text();

    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    // 2. Verify webhook authenticity if secret is configured
    if (webhookSecret) {
      if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json(
          { error: "Missing svix verification headers" },
          { status: 400 }
        );
      }

      const wh = new Webhook(webhookSecret);
      try {
        wh.verify(rawBody, {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        });
      } catch (err) {
        console.error("[Resend Webhook] Signature verification failed:", err);
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 400 }
        );
      }
    } else {
      console.warn("[Resend Webhook] RESEND_WEBHOOK_SECRET not set. Processing in development test mode.");
    }

    // 3. Parse verified JSON payload
    const event: ResendWebhookEvent = JSON.parse(rawBody);
    const eventId = svixId || `evt_${Date.now()}`;

    // 4. Idempotency Check: Prevent duplicate processing if the same webhook is retried
    const existingEvent = await prisma.emailDelivery.findUnique({
      where: { providerEventId: eventId },
    });

    if (existingEvent) {
      return NextResponse.json(
        { message: "Webhook event already processed (idempotent)", eventId },
        { status: 200 }
      );
    }

    // 5. Map event type to database EmailStatus
    let emailStatus: EmailStatus = EmailStatus.SENT;
    if (event.type === "email.delivered") {
      emailStatus = EmailStatus.DELIVERED;
    } else if (event.type === "email.bounced") {
      emailStatus = EmailStatus.BOUNCED;
    } else if (event.type === "email.failed") {
      emailStatus = EmailStatus.FAILED;
    }

    const emailId = event.data?.email_id;
    const recipient = event.data?.to?.[0] || "unknown@campusfix.local";

    // 6. Update existing email delivery record or create new event audit
    if (emailId) {
      const existingDelivery = await prisma.emailDelivery.findFirst({
        where: { providerMessageId: emailId },
      });

      if (existingDelivery) {
        await prisma.emailDelivery.update({
          where: { id: existingDelivery.id },
          data: {
            status: emailStatus,
            eventType: event.type,
            providerEventId: eventId,
            payload: (event.data ? JSON.parse(JSON.stringify(event.data)) : Prisma.JsonNull) as Prisma.InputJsonValue,
          },
        });

        return NextResponse.json(
          { success: true, updated: existingDelivery.id, status: emailStatus },
          { status: 200 }
        );
      }
    }

    // If no prior record was matched, insert verified inbound event
    await prisma.emailDelivery.create({
      data: {
        providerMessageId: emailId || null,
        recipient,
        subject: event.data?.subject || "Facilities Notification",
        template: "inbound-webhook-event",
        status: emailStatus,
        eventType: event.type,
        providerEventId: eventId,
        payload: (event.data ? JSON.parse(JSON.stringify(event.data)) : Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true, eventId }, { status: 200 });
  } catch (error) {
    console.error("[Resend Webhook Execution Error]:", error);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
