import { describe, expect, it } from "vitest";
import { parseFlashcardsJsonFile } from "../../src/utils/importFlashcardsFromJson";

function mockFile(text, name = "cards.json") {
  return new File([text], name, { type: "application/json" });
}

describe("parseFlashcardsJsonFile", () => {
  it("parses an array of question/answer objects", async () => {
    const file = mockFile(
      JSON.stringify([
        { question: "Q1", answer: "A1" },
        { question: "Q2", answer: "A2" },
      ]),
    );
    const cards = await parseFlashcardsJsonFile(file);
    expect(cards).toEqual([
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ]);
  });

  it("accepts export shape with extra fields", async () => {
    const file = mockFile(
      JSON.stringify([{ id: 1, question: "Q", answer: "A", deck: null }]),
    );
    const cards = await parseFlashcardsJsonFile(file);
    expect(cards).toEqual([{ question: "Q", answer: "A" }]);
  });

  it("accepts { flashcards: [...] } wrapper", async () => {
    const file = mockFile(
      JSON.stringify({ flashcards: [{ question: "Q", answer: "A" }] }),
    );
    expect(await parseFlashcardsJsonFile(file)).toHaveLength(1);
  });

  it("rejects invalid JSON", async () => {
    await expect(parseFlashcardsJsonFile(mockFile("{"))).rejects.toThrow(
      /Invalid JSON/,
    );
  });

  it("rejects empty arrays", async () => {
    await expect(parseFlashcardsJsonFile(mockFile("[]"))).rejects.toThrow(
      /no flashcards/,
    );
  });
});
