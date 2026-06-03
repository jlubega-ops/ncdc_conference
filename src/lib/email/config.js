export function getAppUrl() {
  let url = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");

  if (!/^https?:\/\//i.test(url)) {
    const local =
      /^localhost(?::\d+)?$/i.test(url) ||
      /^127\.0\.0\.1(?::\d+)?$/i.test(url) ||
      url.startsWith("localhost:");
    url = `${local ? "http" : "https"}://${url}`;
  }

  return url;
}

/** Trim quotes/spaces often added when copying .env values */
function envValue(key) {
  const raw = process.env[key];
  if (!raw) return "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

export function getSmtpConfig() {
  const host = envValue("SMTP_HOST");
  const port = Number.parseInt(envValue("SMTP_PORT") || "587", 10);
  const user = envValue("SMTP_USER");
  const pass = envValue("SMTP_PASS");
  const from = envValue("SMTP_FROM") || user || "noreply@ncdc.go.ug";

  if (!host || !user || !pass) {
    return null;
  }

  const isGmail = host.includes("gmail.com");

  return {
    host,
    port,
    secure: envValue("SMTP_SECURE") === "true" || port === 465,
    auth: { user, pass },
    from,
    isGmail,
  };
}
