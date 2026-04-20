fetch('https://generativelanguage.googleapis.com/v1beta/models', {method: 'OPTIONS'})
 .then(r => Array.from(r.headers.entries()).forEach(e => console.log(e)))
 .catch(console.error);
