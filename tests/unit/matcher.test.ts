import { matchesKeyword, matchesAnyKeyword, interpolateTemplate, buildMessageVariables } from "@/lib/automation/matcher";

describe("matchesKeyword", () => {
  it("matches exact keyword", () => {
    expect(matchesKeyword("price", "price")).toBe(true);
  });

  it("matches keyword inside sentence", () => {
    expect(matchesKeyword("What is the price?", "price")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(matchesKeyword("PRICE please", "price")).toBe(true);
    expect(matchesKeyword("Price?", "PRICE")).toBe(true);
  });

  it("matches keyword with punctuation around it", () => {
    expect(matchesKeyword("price?", "price")).toBe(true);
    expect(matchesKeyword("«price»", "price")).toBe(true);
  });

  it("does not produce false positives for unrelated text", () => {
    expect(matchesKeyword("Nice post!", "price")).toBe(false);
    expect(matchesKeyword("Hello world", "buy")).toBe(false);
  });

  it("matches multi-word keywords", () => {
    expect(matchesKeyword("how much is the price please", "how much")).toBe(true);
  });
});

describe("matchesAnyKeyword", () => {
  const keywords = ["price", "cost", "buy", "link"];

  it("returns matched keyword when found", () => {
    expect(matchesAnyKeyword("What is the price?", keywords)).toBe("price");
    expect(matchesAnyKeyword("How much does it cost", keywords)).toBe("cost");
  });

  it("returns null when no keyword matches", () => {
    expect(matchesAnyKeyword("Beautiful post!", keywords)).toBeNull();
  });

  it("returns first matched keyword", () => {
    const result = matchesAnyKeyword("price and cost?", keywords);
    expect(["price", "cost"]).toContain(result);
  });

  it("handles empty keywords array", () => {
    expect(matchesAnyKeyword("price?", [])).toBeNull();
  });

  it("handles empty comment", () => {
    expect(matchesAnyKeyword("", keywords)).toBeNull();
  });
});

describe("interpolateTemplate", () => {
  it("replaces known variables", () => {
    const result = interpolateTemplate(
      "Hi {{first_name}}, the price is {{product_price}}",
      { first_name: "Alice", product_price: "₹499" }
    );
    expect(result).toBe("Hi Alice, the price is ₹499");
  });

  it("leaves unknown variables intact", () => {
    const result = interpolateTemplate("Hi {{unknown_var}}", { first_name: "Alice" });
    expect(result).toBe("Hi {{unknown_var}}");
  });

  it("handles empty template", () => {
    expect(interpolateTemplate("", { first_name: "Alice" })).toBe("");
  });

  it("handles no variables in template", () => {
    expect(interpolateTemplate("Hello there", { first_name: "Alice" })).toBe("Hello there");
  });
});

describe("buildMessageVariables", () => {
  it("builds variables from params", () => {
    const vars = buildMessageVariables({
      firstName: "Alice",
      username: "alice123",
      productName: "Custom Poster",
      productPrice: "₹499",
      productUrl: "https://example.com/product",
    });

    expect(vars.first_name).toBe("Alice");
    expect(vars.username).toBe("alice123");
    expect(vars.product_name).toBe("Custom Poster");
    expect(vars.product_price).toBe("₹499");
    expect(vars.product_url).toBe("https://example.com/product");
  });

  it("falls back to username when firstName is missing", () => {
    const vars = buildMessageVariables({ username: "alice123" });
    expect(vars.first_name).toBe("alice123");
  });

  it("falls back to 'there' when both are missing", () => {
    const vars = buildMessageVariables({});
    expect(vars.first_name).toBe("there");
  });
});
