import { describe, expect, it } from "vitest";

import { cx } from "./cx";

describe("cx", () => {
  it("une las clases presentes e ignora las vacías", () => {
    expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
  });
});
