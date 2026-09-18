import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface IssueCreatedEmailProps {
  referenceCode: string;
  title: string;
  category: string;
  location: string;
  priority: string;
  reportedBy: string;
  reportedAt: string;
}

export function IssueCreatedEmail({
  referenceCode,
  title,
  category,
  location,
  priority,
  reportedBy,
  reportedAt,
}: IssueCreatedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>[CampusFix] Incident {referenceCode} Logged: {title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={headerTitle}>CampusFix Operations</Heading>
            <Text style={headerSubtitle}>Campus Facilities & Infrastructure Maintenance</Text>
          </Section>

          <Section style={contentSection}>
            <Text style={greeting}>Hello {reportedBy},</Text>
            <Text style={paragraph}>
              Your campus incident report has been received and logged in the facilities dispatch queue.
            </Text>

            <Section style={card}>
              <Text style={codeBadge}>Reference ID: {referenceCode}</Text>
              <Heading as="h2" style={issueTitle}>{title}</Heading>

              <Hr style={divider} />

              <Text style={metaLine}><strong>Category:</strong> {category}</Text>
              <Text style={metaLine}><strong>Campus Location:</strong> {location}</Text>
              <Text style={metaLine}><strong>Urgency Priority:</strong> {priority}</Text>
              <Text style={metaLine}><strong>Logged At:</strong> {reportedAt}</Text>
              <Text style={metaLine}><strong>Status:</strong> OPEN (Queued for Facilities Triage)</Text>
            </Section>

            <Text style={paragraph}>
              A facilities maintenance engineer will review this report and dispatch personnel. You can track status updates in your CampusFix dashboard.
            </Text>
          </Section>

          <Hr style={footerDivider} />
          <Section style={footer}>
            <Text style={footerText}>
              CampusFix • Automated Facilities Dispatch System • University Infrastructure Operations
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: "24px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e4e4e7",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px",
};

const headerSection: React.CSSProperties = {
  borderBottom: "1px solid #e4e4e7",
  paddingBottom: "16px",
};

const headerTitle: React.CSSProperties = {
  color: "#18181b",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0 0 4px",
};

const headerSubtitle: React.CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  margin: "0",
};

const contentSection: React.CSSProperties = {
  paddingTop: "20px",
};

const greeting: React.CSSProperties = {
  color: "#18181b",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 12px",
};

const paragraph: React.CSSProperties = {
  color: "#3f3f46",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 16px",
};

const card: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "6px",
  padding: "16px",
  margin: "16px 0",
};

const codeBadge: React.CSSProperties = {
  backgroundColor: "#e4e4e7",
  borderRadius: "4px",
  color: "#18181b",
  display: "inline-block",
  fontSize: "11px",
  fontFamily: "monospace",
  fontWeight: "600",
  padding: "2px 6px",
  margin: "0 0 8px",
};

const issueTitle: React.CSSProperties = {
  color: "#18181b",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 12px",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  margin: "12px 0",
};

const metaLine: React.CSSProperties = {
  color: "#52525b",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "4px 0",
};

const footerDivider: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  margin: "24px 0 16px",
};

const footer: React.CSSProperties = {
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "11px",
  lineHeight: "16px",
  margin: "0",
};
