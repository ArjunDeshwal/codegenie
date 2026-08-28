export const hasUnlimitedCreditMetadata = (metadata: unknown) =>
  typeof metadata === "object" &&
  metadata !== null &&
  "codegenieUnlimitedCredits" in metadata &&
  (metadata as Record<string, unknown>).codegenieUnlimitedCredits === true;
