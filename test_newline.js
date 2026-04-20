fetch('https://generativelanguage.googleapis.com/v1beta/models?key=somekey%0A')
  .then(async r => { console.log(r.status, await r.json()); });
