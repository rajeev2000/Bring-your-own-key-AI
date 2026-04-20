fetch('https://generativelanguage.googleapis.com/v1beta/models?key=123')
.then(r => console.log("STATUS: " + r.status + " TEXT: " + r.statusText))
