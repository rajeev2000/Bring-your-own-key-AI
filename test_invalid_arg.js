fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyA_space_is_here%20like%20this')
  .then(async r => { console.log(r.status, await r.json()); });
