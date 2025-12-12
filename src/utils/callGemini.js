// 請將 YOUR_API_KEY_HERE 替換成真正的 Gemini API Key
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; 

export default async function callGemini(prompt) {
  if (!API_KEY) {
    console.warn("⚠️ callGemini：沒有設定 API Key");
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    console.error("Gemini call failed:", err);
    return null;
  }
}
