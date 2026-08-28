import assert from "node:assert/strict";
import test from "node:test";

import { hasUnlimitedCreditMetadata } from "./credit-access";

test("only an explicit private metadata flag enables unlimited credits", () => {
  assert.equal(hasUnlimitedCreditMetadata({ codegenieUnlimitedCredits: true }), true);
  assert.equal(hasUnlimitedCreditMetadata({ codegenieUnlimitedCredits: false }), false);
  assert.equal(hasUnlimitedCreditMetadata({}), false);
  assert.equal(hasUnlimitedCreditMetadata(null), false);
});
