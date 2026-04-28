import fs from "fs";

const file = fs.readFileSync("src/App.tsx", "utf8");

let updated = file;
updated = updated.replace(/bg-\[var\(--accent-app\)\] text-\[var\(--text-app\)\]/g, "bg-[var(--accent-app)] text-white");

updated = updated.replace(/text-\[var\(--text-app\)\]\/50 hover:text-\[var\(--text-app\)\]/g, "text-white/50 hover:text-white");

// Revert placeholder-text-secondary/20
updated = updated.replace(/placeholder-\[var\(--text-secondary\)\]\/20/g, "placeholder-[var(--text-secondary)]");


fs.writeFileSync("src/App.tsx", updated);
console.log("Updated!");
