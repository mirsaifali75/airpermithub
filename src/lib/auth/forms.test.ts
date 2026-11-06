import { describe, expect, it } from "vitest";
import { validEmail } from "./flows";
import { field, textField } from "./forms";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

describe("form input", () => {
  it("drops NUL from every field, which Postgres can't store", () => {
    expect(field(form({ email: "a\u0000b@example.com" }), "email")).toBe("ab@example.com");
    expect(field(form({}), "missing")).toBe("");
  });

  it("keeps a password's other characters as typed", () => {
    expect(field(form({ password: " tab\there and spaces " }), "password")).toBe(" tab\there and spaces ");
  });

  it("removes control and text-direction marks from names", () => {
    expect(textField(form({ name: "Dana\u202e\u0007 Lee\u200b" }), "name")).toBe("Dana Lee");
    expect(textField(form({ name: "José Núñez 李" }), "name")).toBe("José Núñez 李");
  });

  it("refuses emails with control characters", () => {
    expect(validEmail("dana@example.com")).toBe(true);
    expect(validEmail("da\u0001na@example.com")).toBe(false);
    expect(validEmail("dana@exa\u007fmple.com")).toBe(false);
  });
});
