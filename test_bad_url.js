fetch('https://generativelanguage.googleapis.com/v1beta/models?key=fakekey/v1beta/models?key=fakekey')
  .then(async r => { console.log(r.status, await r.json()); });
