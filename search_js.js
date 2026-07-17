const fs = require('fs');
const path = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\d885148a-fb87-4dbe-b7cd-9438789e7c8f\\.system_generated\\steps\\247\\content.md';
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf8');
  console.log("Has localhost:5000?", content.includes("localhost:5000"));
  console.log("Has onrender?", content.includes("onrender"));
  
  let index = 0;
  while ((index = content.indexOf("http", index)) !== -1) {
    console.log("Found http URL snippet:", content.substring(index, index + 80));
    index += 4;
  }
} else {
  console.log("File not found");
}
