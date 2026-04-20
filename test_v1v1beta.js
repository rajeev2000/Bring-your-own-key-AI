fetch('https://generativelanguage.googleapis.com/v1/v1beta/models?key=123')
.then(async r => { console.log(r.status, await r.json()); });
