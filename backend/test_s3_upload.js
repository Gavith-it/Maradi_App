const fs = require('fs');

async function testUpload() {
    console.log("1. Fetching Presigned URL from Backend...");

    // Using the admin token we generated earlier
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6Im93bmVyIiwiaWF0IjoxNzcyMTAwMTIwLCJleHAiOjE3NzI3MDQ5MjB9.HaNXR-H4Pij9eZJx1Y4_oVSIiwn4QwCBiTkPeCkpfnY';

    const response = await fetch('http://localhost:5000/api/items/upload-url?extension=txt', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        console.error("Failed to get URL:", await response.text());
        return;
    }

    const data = await response.json();
    console.log("Got URLs ==>", data);

    console.log("\n2. Uploading file directly to S3...");
    const fileContent = fs.readFileSync('test_image.txt');

    const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'text/plain' // Must match the file type you are uploading
        },
        body: fileContent
    });

    if (uploadResponse.ok) {
        console.log("\n✅ SUCCESS! File uploaded successfully to S3.");
        console.log(`You can view it here: ${data.finalUrl}`);
    } else {
        console.error("\n❌ FAILED to upload to S3", await uploadResponse.text());
    }
}

testUpload();
