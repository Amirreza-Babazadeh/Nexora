/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * CLI Script to Seed Nexora Convex Database
 * 
 * Usage Examples:
 * 
 * 1. Seed Active User & Organization Workspace:
 *    node scripts/seed.js --user=user_2x... --org=org_2x... [--orgName="My Company"] [--name="John Doe"]
 * 
 * 2. Seed Public Demo Data (Vercel, Stripe, Convex, OpenAI, Figma):
 *    node scripts/seed.js --public
 * 
 * 3. Clear All Seeded Data:
 *    node scripts/seed.js --clear
 */

const { execSync } = require("child_process");

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value || true;
    }
  });
  return args;
}

function main() {
  const args = parseArgs();

  if (args.clear) {
    console.log("🧹 Clearing all database data...");
    execSync('npx convex run seed:clearAllData', { stdio: "inherit" });
    return;
  }

  if (args.public) {
    console.log("🌐 Seeding public demo companies and job postings...");
    execSync('npx convex run seed:seedPublicDemoData', { stdio: "inherit" });
    return;
  }

  const clerkUserId = args.user;
  const clerkOrgId = args.org;
  const orgName = args.orgName || "My Active Workspace";
  const userName = args.name || "Employer Admin";

  if (!clerkUserId || !clerkOrgId) {
    console.log(`
🌱 Nexora Data Seeder CLI

Options:
  --user=<ClerkUserID>       Clerk User ID (e.g. user_2xxxx) [Required for workspace seed]
  --org=<ClerkOrgID>         Clerk Organization ID (e.g. org_2xxxx) [Required for workspace seed]
  --orgName="Company Name"   Optional organization name override
  --name="Admin Name"        Optional employer user name override
  --public                   Seed public demo companies (Stripe, Vercel, Convex, OpenAI, Figma)
  --clear                    Clear all jobs and candidate applications

Examples:
  node scripts/seed.js --user=user_2abc123 --org=org_2xyz789 --orgName="Acme Corp"
  node scripts/seed.js --public
  node scripts/seed.js --clear
    `);
    return;
  }

  console.log(`⚡ Seeding workspace data for User "${clerkUserId}" and Org "${clerkOrgId}"...`);

  const payload = JSON.stringify({
    clerkUserId,
    clerkOrgId,
    orgName,
    userName,
  });

  // Execute convex run command safely
  const command = `npx convex run seed:seedUserWorkspaceData '${payload}'`;
  execSync(command, { stdio: "inherit" });
  console.log("✅ Workspace seeding completed successfully!");
}

main();
