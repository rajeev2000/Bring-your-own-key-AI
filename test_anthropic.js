fetch('https://api.anthropic.com/v1/models', {headers: {'Authorization': 'Bearer 123'}})
.then(async r => { console.log(r.status, await r.text()); });
