import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const acc = await prisma.account.findFirst({
  where: { provider: "google", refresh_token: { not: null } },
});
if (!acc?.refresh_token) {
  console.error("NO_TOKEN");
  process.exit(1);
}

const oauth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);
oauth.setCredentials({ refresh_token: acc.refresh_token });
const sheets = google.sheets({ version: "v4", auth: oauth });

const meta = await sheets.spreadsheets.get({
  spreadsheetId: process.env.GOOGLE_SHEETS_ID,
  fields: "sheets.properties",
});
console.log(
  "TABS:",
  JSON.stringify(
    meta.data.sheets?.map((s) => s.properties),
    null,
    2,
  ),
);

for (const opt of ["FORMULA", "UNFORMATTED_VALUE", "FORMATTED_VALUE"]) {
  console.log("\n====", opt, "====");
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: "'System Design & Sizing'!A1:L60",
    valueRenderOption: opt,
  });
  const rows = res.data.values || [];
  rows.forEach((r, i) => {
    console.log(
      String(i + 1).padStart(2, "0") +
        "|" +
        r.map((c) => String(c).replace(/\n/g, " ")).join(" || "),
    );
  });
}

await prisma.$disconnect();
