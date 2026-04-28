import fs from "fs";

const file = fs.readFileSync("src/App.tsx", "utf8");

let updated = file;
updated = updated.replace(/#71717a/g, "var(--text-secondary)");
updated = updated.replace(/border-white\/5/g, "border-[var(--border-app)]");

fs.writeFileSync("src/App.tsx", updated);
console.log("Updated!");
