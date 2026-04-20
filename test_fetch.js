const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log("No API key provided in environment.");
  process.exit(1);
}
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(console.error);
