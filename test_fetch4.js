fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=a%20b`)
  .then(async r => {
    console.log(r.status);
    console.log(await r.text());
  });
