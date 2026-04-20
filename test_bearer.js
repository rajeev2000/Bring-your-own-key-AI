fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'Authorization': 'Bearer 123' } })
  .then(async r => { console.log(r.status, await r.json()); });
