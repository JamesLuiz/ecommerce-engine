import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const input = (req as any).files
  if (!input?.length) {
    res.status(400).json({ message: "No files were uploaded" })
    return
  }

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: input.map((file) => ({
        filename: file.originalname,
        mimeType: file.mimetype,
        content: file.buffer.toString("base64"),
        access: "public",
      })),
    },
  })

  res.status(200).json({ files: result })
}