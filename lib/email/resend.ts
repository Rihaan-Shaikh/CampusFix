import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { EmailStatus } from "@prisma/client";
import { IssueCreatedEmail } from "@/components/email/issue-created-email";
import * as React from "react";

const resendApiKey = process.env.RESEND_API_KEY?.trim();
export const resend = resendApiKey && resendApiKey.length > 0 ? new Resend(resendApiKey) : null;

interface SendIssueNotificationParams {
  issueId: string;
  referenceCode: string;
  title: string;
  category: string;
  location: string;
  priority: string;
  recipientEmail: string;
  recipientName: string;
  userId: string;
}

export async function sendIssueNotification({
  issueId,
  referenceCode,
  title,
  category,
  location,
  priority,
  recipientEmail,
  recipientName,
  userId,
}: SendIssueNotificationParams) {
  const subject = `[CampusFix] Issue Report Received — ${referenceCode}`;
  const template = "issue-created-confirmation";
  const fromAddress = process.env.EMAIL_FROM || "CampusFix Facilities <onboarding@resend.dev>";
  const formattedDate = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  try {
    let providerMessageId: string | null = null;
    let emailStatus: EmailStatus = EmailStatus.SENT;

    if (resend) {
      const response = await resend.emails.send({
        from: fromAddress,
        to: recipientEmail,
        subject,
        react: React.createElement(IssueCreatedEmail, {
          referenceCode,
          title,
          category,
          location,
          priority,
          reportedBy: recipientName,
          reportedAt: formattedDate,
        }),
      });

      if (response.error) {
        console.error("[Resend API Error]:", response.error);
        emailStatus = EmailStatus.FAILED;
      } else if (response.data) {
        providerMessageId = response.data.id;
      }
    } else {
      // In local development when RESEND_API_KEY is not configured
      console.log(
        `[Email Dev Mock] RESEND_API_KEY not configured. Mocking delivery of "${subject}" to ${recipientEmail}`
      );
      emailStatus = EmailStatus.QUEUED;
      providerMessageId = `mock_msg_${Date.now()}`;
    }

    // Persist email delivery audit record in PostgreSQL
    const record = await prisma.emailDelivery.create({
      data: {
        providerMessageId,
        recipient: recipientEmail,
        subject,
        template,
        status: emailStatus,
        eventType: emailStatus === EmailStatus.SENT ? "email.sent" : "email.queued",
        issueId,
        userId,
        payload: {
          to: [recipientEmail],
          from: fromAddress,
          subject,
          referenceCode,
          dispatchedAt: new Date().toISOString(),
        },
      },
    });

    return { success: true, deliveryId: record.id, providerMessageId };
  } catch (error) {
    console.error("[sendIssueNotification Error]:", error);
    // Persist failure record for audit trail without rolling back the issue
    try {
      await prisma.emailDelivery.create({
        data: {
          recipient: recipientEmail,
          subject,
          template,
          status: EmailStatus.FAILED,
          eventType: "email.failed",
          issueId,
          userId,
          payload: {
            error: error instanceof Error ? error.message : "Unknown email dispatch error",
          },
        },
      });
    } catch {
      // Ignore fallback error
    }
    return { success: false, error };
  }
}
