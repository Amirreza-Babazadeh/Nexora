import { query } from "./_generated/server";

export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity?.name ?? identity?.email ?? null;
  },
});
