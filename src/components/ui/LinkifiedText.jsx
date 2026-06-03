const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

/**
 * @param {string} text
 */
function tokenizeTextWithLinks(text) {
  const tokens = [];
  let lastIndex = 0;
  let match;

  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    tokens.push({ type: "link", value: match[0] });
    lastIndex = URL_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

function normalizeHref(match) {
  const trimmed = match.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * @param {object} props
 * @param {string} props.text
 * @param {string} [props.className]
 */
export function LinkifiedText({ text, className }) {
  if (!text?.trim()) return null;

  const tokens = tokenizeTextWithLinks(text);

  return (
    <p className={`whitespace-pre-wrap text-sm text-muted-foreground ${className ?? ""}`}>
      {tokens.map((token, index) =>
        token.type === "link" ? (
          <a
            key={`link-${index}`}
            href={normalizeHref(token.value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {token.value}
          </a>
        ) : (
          <span key={`text-${index}`}>{token.value}</span>
        ),
      )}
    </p>
  );
}
