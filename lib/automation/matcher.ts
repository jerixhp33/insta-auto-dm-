/**
 * Keyword matching engine for automation triggers.
 * Pure functions — no side effects, fully testable.
 */

export function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

export function matchesKeyword(commentText: string, keyword: string): boolean {
  const normalizedComment = normalizeText(commentText);
  const normalizedKeyword = normalizeText(keyword);

  // Whole word / token match — keyword appears as a standalone word
  const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\s|[^\\w])${escaped}(?:$|\\s|[^\\w])`, "i");
  return pattern.test(normalizedComment) || normalizedComment.includes(normalizedKeyword);
}

export function matchesAnyKeyword(commentText: string, keywords: string[]): string | null {
  for (const keyword of keywords) {
    if (matchesKeyword(commentText, keyword)) {
      return keyword;
    }
  }
  return null;
}

export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`;
  });
}

export function buildMessageVariables(params: {
  firstName?: string;
  username?: string;
  productName?: string;
  productPrice?: string;
  productUrl?: string;
}): Record<string, string> {
  return {
    first_name: params.firstName || params.username || "there",
    username: params.username || "",
    product_name: params.productName || "",
    product_price: params.productPrice || "",
    product_url: params.productUrl || "",
  };
}
