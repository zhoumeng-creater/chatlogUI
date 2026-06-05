import { describe, expect, it } from "vitest";
import { collectPrivacySnapshotFromDocument } from "./privacy-scan";

describe("privacy scan utility", () => {
  it("captures form values and placeholders in addition to visible text and accessible attributes", () => {
    const input = element({
      "aria-label": "safe input",
      value: "Synthetic semantic question for redaction tests only",
      placeholder: "Synthetic semantic placeholder for redaction tests only",
    });
    const textarea = element({
      value: "Synthetic graph question for redaction tests only",
      placeholder: "Synthetic graph question placeholder for redaction tests only",
    });
    const select = element({
      value: "Synthetic selected value for redaction tests only",
    });
    const image = element({
      alt: "Synthetic graph entity alt for redaction tests only",
    });
    const document = {
      body: { innerText: "Visible safe text" },
      querySelectorAll(selector: string) {
        if (selector === "[aria-label],[title],img[alt]") return [input, select, image];
        if (selector === "input, textarea, select") return [input, textarea, select];
        return [];
      },
    } as unknown as Document;

    const snapshot = collectPrivacySnapshotFromDocument(document);

    expect(snapshot).toContain("Synthetic semantic question for redaction tests only");
    expect(snapshot).toContain("Synthetic semantic placeholder for redaction tests only");
    expect(snapshot).toContain("Synthetic graph question for redaction tests only");
    expect(snapshot).toContain("Synthetic graph question placeholder for redaction tests only");
    expect(snapshot).toContain("Synthetic selected value for redaction tests only");
    expect(snapshot).toContain("Synthetic graph entity alt for redaction tests only");
  });
});

function element(fields: Record<string, string>) {
  return {
    value: fields.value ?? "",
    placeholder: fields.placeholder ?? "",
    getAttribute(name: string) {
      return fields[name] ?? "";
    },
  };
}
