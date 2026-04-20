const apiKey = process.env.GEMINI_API_KEY;
fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
  .then(async r => { console.log(r.status, await r.json()); });
