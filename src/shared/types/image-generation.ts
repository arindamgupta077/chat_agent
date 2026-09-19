import { z } from 'zod'

export const ImageGenerationStatusSchema = z.enum(['pending', 'generating', 'done', 'error'])
export type ImageGenerationStatus = z.infer<typeof ImageGenerationStatusSchema>

// Model info for image generation
export const ImageGenerationModelSchema = z.object({
  provider: z.string(),
  modelId: z.string(),
})
export type ImageGenerationModel = z.infer<typeof ImageGenerationModelSchema>

export const ImageGenerationSourceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chatbox_cli'),
    sessionId: z.string(),
    toolCallId: z.string(),
  }),
])
export type ImageGenerationSource = z.infer<typeof ImageGenerationSourceSchema>

// Image generation record schema
export const ImageGenerationSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  referenceImages: z.array(z.string()), // storage keys
  generatedImages: z.array(z.string()), // storage keys
  generatedImageThumbnails: z.array(z.string()).optional(), // thumbnail URLs aligned with generatedImages
  createdAt: z.number(),
  model: ImageGenerationModelSchema,
  dalleStyle: z.enum(['vivid', 'natural']).optional(),
  imageGenerateNum: z.number().optional(),
  status: ImageGenerationStatusSchema,
  parentIds: z.array(z.string()).optional(), // for tracking iteration DAG (multiple parents possible)
  error: z.string().optional(),
  errorCode: z.union([z.number(), z.string()]).optional(),
  errorItemUuid: z.string().optional(),
  taskId: z.string().optional(), // Backend task ID for polling
  aspectRatio: z.string().optional(), // Store aspect ratio for record
  source: ImageGenerationSourceSchema.optional(), // Originating workflow for reconnecting completion callbacks
})
export type ImageGeneration = z.infer<typeof ImageGenerationSchema>

// Pagination result
export interface ImageGenerationPage {
  items: ImageGeneration[]
  nextCursor: number | null
  total: number
}
