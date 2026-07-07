import { describe, expect, it } from "vitest";
import { toneForValue } from "@/components/ui/badge";

describe("badge tone mapping", () => {
  it("normalizes padded CRM status labels before choosing a tone", () => {
    expect(toneForValue(" 完了 ")).toBe("green");
    expect(toneForValue(" 未対応 ")).toBe("red");
    expect(toneForValue(" 対応中 ")).toBe("yellow");
    expect(toneForValue(" 新規（広告経由） ")).toBe("blue");
    expect(toneForValue(" 商談化 ")).toBe("purple");
    expect(toneForValue("prospect")).toBe("blue");
    expect(toneForValue("customer")).toBe("green");
    expect(toneForValue("churned")).toBe("red");
  });
});
