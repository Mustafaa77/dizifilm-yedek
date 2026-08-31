import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `Sen NoxBot'sun. NOXEN platformunun film/dizi öneri asistanısın.

Kurallar:
- HER ZAMAN Türkçe yanıtla
- Kısa ve sade yaz, maksimum 3-4 cümle. Gereksiz uzatma.
- Günlük, samimi bir dil kullan. Arkadaşınla sohbet eder gibi yaz.
- ASLA şatafatlı, abartılı, pazarlama dili kullanma. "Görsel şölen", "nefes kesen", "muhteşem", "efsane", "heyecan dolu macera" gibi klişe ifadeler YASAK.
- Film/dizi adını **kalın** yaz, yanına yılını ekle yeterli.
- Spoiler verme
- NOXEN özelliklerini (Favoriler, Watch Party vs.) her cevaba zorla sıkıştırma, sadece gerçekten uygunsa kısaca bahset.
- Doğal ol. Düz ve net öner, süsleme.`;

export async function POST(req: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'API anahtarı bulunamadı' }, { status: 500 });
    }

    try {
        const { message, context, history } = await req.json();

        if (!message?.trim()) {
            return NextResponse.json({ error: 'Mesaj gerekli' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.6-flash', // <--- Doğrudan 3.6-flash modeline istek (fallback yok)
            systemInstruction: SYSTEM_INSTRUCTION,
        });

        // 1. History'yi SDK formatına çevir
        const contents = [];

        if (Array.isArray(history)) {
            for (const h of history) {
                if (h?.parts?.[0]?.text) {
                    contents.push({
                        role: h.role, // 'user' veya 'model'
                        parts: [{ text: h.parts[0].text }]
                    });
                }
            }
        }

        // 2. Yeni mesajı ve sayfa bağlamını ekle
        const userText = context?.trim()
            ? `[Bağlam: ${context}]\n\n${message}`
            : message;

        contents.push({
            role: 'user',
            parts: [{ text: userText }]
        });

        const result = await model.generateContent({
            contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        });

        const reply = result.response.text();

        if (!reply) {
            return NextResponse.json({ error: 'AI boş yanıt döndürdü' }, { status: 502 });
        }

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
    }
}
