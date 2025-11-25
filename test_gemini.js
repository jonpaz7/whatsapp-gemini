const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        // There isn't a direct listModels on the instance in the simple SDK usage usually, 
        // but let's try to just generate content with a known fallback or check documentation behavior.
        // Actually, for the node SDK, we might not have a direct listModels method exposed easily on the main entry 
        // without using the model manager if it exists. 
        // Let's try a simple generation to test the key and model.

        console.log("Testing gemini-1.0-pro...");
        const result = await model.generateContent("Hello");
        console.log("Success! Response:", result.response.text());
    } catch (error) {
        console.error("Error testing gemini-1.0-pro:", error.message);
    }
}

listModels();
