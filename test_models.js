const apiKey = 'AIzaSyDMpL_HQlMJhe_St2NXa-KqKbQqkSSwYSo';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
.then(res => res.json())
.then(data => {
  console.log(data);
})
.catch(console.error);
