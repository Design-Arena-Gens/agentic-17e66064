import { describe, expect, it } from "vitest";
import { generateResponse } from "@/lib/assistant";

describe("generateResponse", () => {
  it("detects greetings", () => {
    const response = generateResponse("hello there");
    expect(response.intent).toBe("greeting");
    expect(response.text.toLowerCase()).toContain("aurora");
  });

  it("answers time related queries", () => {
    const response = generateResponse("can you tell me the time?");
    expect(response.intent).toBe("time");
    expect(response.text).toMatch(/^It is/);
  });
});
