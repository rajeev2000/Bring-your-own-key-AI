import fs from "fs";

const file = fs.readFileSync("src/App.tsx", "utf8");

let updated = file;
updated = updated.replace(/text-white/g, "text-[var(--text-app)]");
updated = updated.replace(/bg-white/g, "bg-[var(--card-app)]");
updated = updated.replace(/placeholder-white/g, "placeholder-[var(--text-secondary)]");

fs.writeFileSync("src/App.tsx", updated);
console.log("Updated!");
