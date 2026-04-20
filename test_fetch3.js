fetch(`https://generativelanguage.googleapis.com/v1beta/v1beta/models?key=someik`)
  .then(async r => {
    console.log(r.status);
    console.log(await r.text());
  });
