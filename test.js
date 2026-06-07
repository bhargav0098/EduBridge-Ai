const apiKey = 'AIzaSyDMpL_HQlMJhe_St2NXa-KqKbQqkSSwYSo';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [ { parts: [ { text: "Hello" } ] } ]
  })
})
.then(res => res.json().then(data => ({status: res.status, data})))
.then(console.log)
.catch(console.error);
