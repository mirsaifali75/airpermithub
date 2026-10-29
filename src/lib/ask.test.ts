import { describe, expect, it } from "vitest";
import { askEmail, askTopics, emptyAsk, getAskTopic, mailtoHref } from "./ask";

const url = "https://airpermithub.com";

describe("ask email", () => {
  it("builds a question with only the facts that were filled in", () => {
    const { subject, body } = askEmail({ ...emptyAsk(), topic: "pte", question: "  How do I count  a backup generator? ", state: "Texas", page: "/states/texas" }, url);
    expect(subject).toBe("[AirPermitHub question] How do I count a backup generator?");
    expect(body).toContain("Topic: Potential to emit and emission calculations");
    expect(body).toContain("State: Texas");
    expect(body).not.toContain("Industry:");
    expect(body).not.toContain("Page:");
    expect(body).toContain("Public answer: No, keep this private");
    expect(body).toContain("Question:\nHow do I count  a backup generator?");
    expect(body).not.toContain("From:");
    expect(body.endsWith(`Sent from ${url}/ask`)).toBe(true);
    expect(body).not.toMatch(/\n\n\n/);
  });

  it("labels a correction and keeps the page it came from", () => {
    const { subject, body } = askEmail({ ...emptyAsk(), topic: "correction", page: "/states/ohio", question: "The agency link is broken.", context: "New link on the agency site", name: "Pat", publicOk: true }, url);
    expect(subject.startsWith("[AirPermitHub correction] ")).toBe(true);
    expect(body).toContain("Page: /states/ohio");
    expect(body).toContain("What's wrong:\nThe agency link is broken.");
    expect(body).toContain("Correct information and source:\nNew link on the agency site");
    expect(body).not.toContain("Public answer");
    expect(body).toContain("From: Pat");
  });

  it("shortens a long subject", () => {
    const { subject } = askEmail({ ...emptyAsk(), topic: "nsr", question: "word ".repeat(40) }, url);
    expect(subject.length).toBeLessThanOrEqual("[AirPermitHub question] ".length + 60);
    expect(subject.endsWith("…")).toBe(true);
  });

  it("encodes the mailto link", () => {
    const href = mailtoHref("ask@example.com", "A & B", "line 1\nline 2");
    expect(href).toBe("mailto:ask@example.com?subject=A%20%26%20B&body=line%201%0Aline%202");
  });

  it("has unique topics and no numbers in topic labels", () => {
    expect(new Set(askTopics.map((t) => t.slug)).size).toBe(askTopics.length);
    for (const t of askTopics) {
      expect(getAskTopic(t.slug)).toBe(t);
      expect(t.label).not.toMatch(/\d/);
    }
  });
});
