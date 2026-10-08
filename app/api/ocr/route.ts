import { Mistral } from "@mistralai/mistralai";

import { env } from "@/env";

const MODEL = "mistral-ocr-2512";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "A PDF file is required" }, { status: 400 });
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const client = new Mistral({ apiKey: env.MISTRAL_API_KEY });

    const ocrResponse = await client.ocr.process({
      model: MODEL,
      document: {
        type: "document_url",
        documentUrl: `data:application/pdf;base64,${base64}`,
        documentName: file.name,
      },
      tableFormat: "html",
      includeImageBase64: false,
    });
    for (const page of ocrResponse.pages) {
      console.log(page);
    }

    const text = ocrResponse.pages.map((page) => page.markdown).join("\n\n");
    return Response.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
