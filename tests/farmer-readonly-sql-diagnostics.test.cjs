const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const diagnostics = [
  "supabase/diagnostics/farmer_schema_preflight.sql",
  "supabase/diagnostics/farmer_photo_schema_preflight.sql",
  "supabase/diagnostics/farmer_duplicate_code_preflight.sql"
];

// Remove SQL comments and literal contents before checking executable statement text.
// This prevents words such as "UPDATE" in explanatory comments or string values from
// being mistaken for executable statements.
function stripCommentsAndLiterals(sql) {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    if (sql.startsWith("--", i)) {
      const end = sql.indexOf("\n", i);
      i = end < 0 ? sql.length : end + 1;
      out += "\n";
      continue;
    }
    if (sql.startsWith("/*", i)) {
      const end = sql.indexOf("*/", i + 2);
      assert.notEqual(end, -1, "SQL block comment must be closed");
      i = end + 2;
      out += " ";
      continue;
    }
    if (sql[i] === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      out += " '' ";
      continue;
    }
    if (sql[i] === '"') {
      i++;
      while (i < sql.length) {
        if (sql[i] === '"' && sql[i + 1] === '"') {
          i += 2;
          continue;
        }
        if (sql[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      out += ' "" ';
      continue;
    }
    out += sql[i++];
  }
  return out;
}

for (const relativePath of diagnostics) {
  test(relativePath + " is explicitly TEST-only and read-only", () => {
    const absolutePath = path.join(process.cwd(), relativePath);
    assert.ok(fs.existsSync(absolutePath), "diagnostic SQL file must exist");
    const source = fs.readFileSync(absolutePath, "utf8");
    assert.match(source, /READ-ONLY|read-only/i, "must declare read-only intent");
    assert.match(source, /TEST/i, "must declare TEST environment scope");

    const executable = stripCommentsAndLiterals(source);
    const statements = executable.split(";").map(s => s.trim()).filter(Boolean);
    assert.ok(statements.length > 0, "diagnostic must contain SQL statements");

    for (const [index, statement] of statements.entries()) {
      assert.match(
        statement,
        /^(?:select|with)\b/i,
        "statement " + (index + 1) + " must be a SELECT or read-only CTE"
      );
      assert.doesNotMatch(
        statement,
        /\b(?:insert\s+into|update\s+[a-z_]|delete\s+from|merge\s+into|alter\s+table|create\s+(?:table|index|policy|trigger|function|schema)|drop\s+(?:table|index|policy|trigger|function|schema)|truncate\s+|grant\s+|revoke\s+|comment\s+on|refresh\s+materialized|call\s+|do\s+\$|copy\s+)\b/i,
        "statement " + (index + 1) + " must not contain a data/schema/security mutation"
      );
    }
  });
}
