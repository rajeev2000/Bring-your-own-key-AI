fetch('https://generativelanguage.googleapis.com/v1beta/models')
  .then(async r => { console.log(r.status, await r.json()); });
