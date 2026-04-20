fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=some-invalid-key123`)
  .then(async r => {
    console.log(r.status);
    console.log(await r.text());
  });
