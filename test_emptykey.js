fetch('https://generativelanguage.googleapis.com/v1beta/models?key=')
  .then(async r => { console.log(r.status, await r.json()); });
