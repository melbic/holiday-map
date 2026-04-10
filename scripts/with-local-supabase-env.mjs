import { execFileSync, spawn } from "node:child_process";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/with-local-supabase-env.mjs <command> [args...]");
  process.exit(1);
}

let statusOutput = "";
let lastStatusError;

for (let attempt = 1; attempt <= 15; attempt += 1) {
  try {
    statusOutput = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
    });
    lastStatusError = undefined;
    break;
  } catch (error) {
    lastStatusError = error;
    await sleep(2000);
  }
}

if (!statusOutput) {
  throw lastStatusError;
}

const supabaseEnv = Object.fromEntries(
  statusOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        return ["", ""];
      }

      const key = line.slice(0, separatorIndex);
      let value = line.slice(separatorIndex + 1);

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      return [key, value];
    })
    .filter(([key]) => key !== ""),
);

if (!supabaseEnv.API_URL || !supabaseEnv.SERVICE_ROLE_KEY) {
  console.error("Could not read API_URL and SERVICE_ROLE_KEY from `supabase status -o env`.");
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    ...supabaseEnv,
    SUPABASE_URL: supabaseEnv.API_URL,
    SUPABASE_SECRET_KEY: supabaseEnv.SECRET_KEY,
  },
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
