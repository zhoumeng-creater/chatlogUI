import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import dateInputSource from "./DateInput.tsx?raw";
import { DateInput } from "./DateInput";

describe("DateInput", () => {
  it("uses a consistent text format instead of the native mixed date placeholder", () => {
    const html = renderToStaticMarkup(
      <DateInput aria-label="开始日期" value="" onChange={() => {}} />,
    );

    expect(html).toContain('type="text"');
    expect(html).toContain('placeholder="YYYY-MM-DD"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('pattern="\\d{4}-\\d{2}-\\d{2}"');
    expect(dateInputSource).not.toContain('type="date"');
  });
});
