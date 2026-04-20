const apiKey = process.env.GEMINI_API_KEY;
fetch(`https://generativelanguage.googleapis.com/v1beta/v1beta/models?key=${apiKey}`)
  .then(async r => { console.log(r.status, await r.json()); });
