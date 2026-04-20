fetch('https://generativelanguage.googleapis.com/v1beta/models', {
  method: 'OPTIONS', 
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'GET'
  }
})
 .then(r => Array.from(r.headers.entries()).forEach(e => console.log(e)))
 .catch(console.error);
