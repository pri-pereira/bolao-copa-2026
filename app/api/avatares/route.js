import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "avatares");
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ avatares: [] });
    }
    
    // Filtra apenas imagens e gifs válidos
    const files = fs.readdirSync(dir)
      .filter(file => {
        const ext = file.toLowerCase();
        return ext.endsWith(".png") || ext.endsWith(".gif") || ext.endsWith(".jpg") || ext.endsWith(".jpeg");
      });
      
    return NextResponse.json({ avatares: files });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
