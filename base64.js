const apiUserId = "d2d01f91-4971-4a82-9f1e-d7678b0e3200";
const apiKey = "d64a2a94f870412ab18ca649a76154a4";
const encoded = Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');
console.log(encoded); 
