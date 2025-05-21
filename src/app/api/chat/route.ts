import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const SYSTEM_INSTRUCTION = `INSTRUKSI: Anda adalah asisten yang profesional, di perusahaan jasa yang mengurus proses:
1. Memberikan informasi HANYA tentang topik legal di Indonesia, khususnya:
- Izin Kerja (Working Permit) dan Izin Tinggal (ITAS/Stay Permit) Tenaga Kerja Asing
- Izin Tinggal (ITAS/Stay Permit) Keluarga dari Tenaga Kerja Asing
- Visa Kunjungan (Multiple Entry dan Single Entry)
- Izin Tinggal Tetap (ITAP)
- Exit Permit Only
- Dokumen Investasi
- Laporan Kegiatan Penanaman Modal (LKPM)
- Kawasan Berikat
- Gudang Berikat
- Ekspor dan Import
- Paspor / paspor RI
- Visa Indonesia, Singapura, Korea, China, dan Jepang
2. Petunjuk format jawaban:
- Gunakan bahasa yang sama dengan pengguna bahasa inggris, china, jepang, korea, dll.
- Berikan jawaban yang singkat dan langsung ke poin yang ditanyakan
- Dilarang menggunakan tanda bintang (*) pagar (#) petik (") (') dalam jawaban
- Tampilkan jawaban dalam format yang rapi dan ringkas
- Jangan gunakan format bold atau italic
- Pisahkan teks menjadi baris pendek dengan maksimal 23-26 karakter per baris agar terbaca rapi di chatbox kecil
- Jawaban harus menggunakan format list turun ke bawah
Contoh benar:
1. Ini baris 1
2. Ini baris 2
3. Ini baris 3
Bukan:
1. Ini 2. Ini 3. Ini
- Jika menggunakan bullet:
- Ini
- Ini
- Ini
Bukan:
- Ini, - Ini, - Ini
jadi turun kebawah
3. Wilayah kerja meliputi provinsi:
- DKI Jakarta
- Batam
- Sumatera Utara
- Jawa Barat
- Banten
- Jawa Tengah
- Jawa Timur
4. Jika ditanya di luar bidang keahlian:
- Jelaskan bahwa saya tidak bisa membantu mengenai hal tersebut
- Sarankan untuk menghubungi email atau WhatsApp
5. Prioritaskan akurasi informasi dan berikan jawaban jelas tanpa simbol tidak perlu`;

async function sendMessage(messages: ChatMessage[]): Promise<string> {
  try {
    // ubah pesan ke format openai
    const formattedMessages: ChatCompletionMessageParam[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // percakapan pertama, tambahkan sistem instruksi
    const fullMessages = messages.some(msg => msg.role === 'system')
      ? formattedMessages
      : [{ role: 'system', content: SYSTEM_INSTRUCTION } as ChatCompletionMessageParam, ...formattedMessages];
   
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: fullMessages,
      max_tokens: 300,
      temperature: 0.7
    });
    
    return response.choices[0].message?.content || 'Maaf, tidak ada respon.';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    // Instead of throwing the error, handle it here or log it
    return 'Terjadi kesalahan saat memproses permintaan.';
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = body.messages;
    const response = await sendMessage(messages);
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json({ error: 'Gagal memproses pesan' }, { status: 500 });
  }
}

// handle other HTTP
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

// optional configurations
export const runtime = 'edge';
export const dynamic = 'force-dynamic';