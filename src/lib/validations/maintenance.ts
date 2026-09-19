import { z } from "zod";

export const START_FRESH_CONFIRMATION = "START FRESH STARTEK";

export const startFreshSchema = z.object({
  confirmation: z.literal(START_FRESH_CONFIRMATION, {
    error: `Type ${START_FRESH_CONFIRMATION} exactly to confirm`,
  }),
  backupConfirmed: z.literal(true, {
    error: "Confirm that the latest backup was downloaded and safely stored",
  }),
});

export type StartFreshInput = z.input<typeof startFreshSchema>;
