
const ALLOWED_ORIGINS = [
  "https://procshield.com",
  "https://www.procshield.com"
];

const MAILBOX = "contact@procshield.com";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return Response.json(
        { success: false, error: "Origin not allowed" },
        { status: 403 }
      );
    }

    if (origin) {
      headers["Access-Control-Allow-Origin"] = origin;
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (!env.HOSTINGER_MAIL_API_TOKEN) {
      return Response.json(
        { success: false, error: "Mail API token is missing" },
        { status: 500, headers }
      );
    }

    try {
      // Verify API access and find the correct mailbox.
      const accountResponse = await fetch(
        "https://api.mail.hostinger.com/api/v1/me",
        {
          headers: {
            "Authorization": `Bearer ${env.HOSTINGER_MAIL_API_TOKEN}`,
            "Accept": "application/json"
          }
        }
      );

      if (!accountResponse.ok) {
        return Response.json(
          { success: false, error: "Hostinger authentication failed" },
          { status: 502, headers }
        );
      }

      const account = await accountResponse.json();
      const mailbox = account.data.mailboxes.find(
        item => item.address.toLowerCase() === MAILBOX
      );

      if (!mailbox) {
        return Response.json(
          { success: false, error: "Contact mailbox not found" },
          { status: 500, headers }
        );
      }

      // Health check.
      if (request.method === "GET") {
        return Response.json(
          { success: true, message: "Contact API is ready" },
          { headers }
        );
      }

      if (request.method !== "POST") {
        return Response.json(
          { success: false, error: "Method not allowed" },
          { status: 405, headers }
        );
      }

      if (!request.headers.get("Content-Type")?.includes("application/json")) {
        return Response.json(
          { success: false, error: "Send JSON data" },
          { status: 415, headers }
        );
      }

      const rawBody = await request.text();

      if (new TextEncoder().encode(rawBody).length > 12000) {
        return Response.json(
          { success: false, error: "Message is too large" },
          { status: 413, headers }
        );
      }

      const body = JSON.parse(rawBody);

      // Honeypot field for basic spam filtering.
      if (body.website) {
        return Response.json({ success: true }, { headers });
      }

      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim();
      const message = String(body.message || "").trim();

      if (
        name.length < 2 || name.length > 120 ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        message.length < 5 || message.length > 5000
      ) {
        return Response.json(
          { success: false, error: "Please provide valid form details" },
          { status: 400, headers }
        );
      }

      const emailResponse = await fetch(
        `https://api.mail.hostinger.com/api/v1/mailboxes/${encodeURIComponent(mailbox.resourceId)}/send`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.HOSTINGER_MAIL_API_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            to: [MAILBOX],
            displayName: "ProcShield Website",
            subject: "New enquiry from ProcShield website",
            text:
              `New contact form submission\n\n` +
              `Name: ${name}\n` +
              `Email: ${email}\n\n` +
              `Message:\n${message}`
          })
        }
      );

      if (emailResponse.status !== 204) {
        const details = await emailResponse.text();

        return Response.json(
          {
            success: false,
            error: "Hostinger could not send the email",
            providerStatus: emailResponse.status,
            details: details.slice(0, 500)
          },
          { status: 502, headers }
        );
      }

      return Response.json(
        { success: true, message: "Your message has been sent successfully!" },
        { headers }
      );

    } catch (error) {
      return Response.json(
        { success: false, error: "Something went wrong while sending your message" },
        { status: 500, headers }
      );
    }
  }
};
