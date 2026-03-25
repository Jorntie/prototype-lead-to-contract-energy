import { z } from "zod";

export const OPPORTUNITY_STAGES = [
  "DISCOVERY",
  "QUOTING",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const opportunityStageOptions = [
  { value: "DISCOVERY", label: "Discovery" },
  { value: "QUOTING", label: "Quoting" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
] as const;

export const createOpportunitySchema = z.object({
  accountId: z.string().uuid("Invalid account ID"),
  expectedCloseDate: z.coerce.date().optional().or(z.literal("")),
  contractDuration: z.coerce
    .number()
    .int()
    .positive("Must be a positive number")
    .optional()
    .or(z.literal("")),
  assignedToId: z.string().uuid("Invalid user ID").optional().or(z.literal("")),
  siteIds: z.array(z.string().uuid("Invalid site ID")).optional(),
});

export const updateOpportunitySchema = createOpportunitySchema.partial();

export const updateStageSchema = z
  .object({
    stage: z.enum(OPPORTUNITY_STAGES, {
      errorMap: () => ({
        message: `Stage must be one of: ${OPPORTUNITY_STAGES.join(", ")}`,
      }),
    }),
    winLossReason: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.stage === "LOST") {
        return !!data.winLossReason && data.winLossReason.trim().length > 0;
      }
      return true;
    },
    {
      message: "Win/loss reason is required when stage is LOST",
      path: ["winLossReason"],
    }
  );

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
