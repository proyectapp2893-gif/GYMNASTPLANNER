import {z} from 'zod'
export const allowedEvidenceMimeTypes=['video/mp4','video/quicktime','image/jpeg','image/png','image/webp'] as const
// Límite técnico absoluto; el límite operativo real se obtiene por organización.
export const MAX_EVIDENCE_BYTES=500*1024*1024
export const evidenceUploadSchema=z.object({fileName:z.string().trim().min(1).max(180),mimeType:z.enum(allowedEvidenceMimeTypes),sizeBytes:z.number().int().positive().max(MAX_EVIDENCE_BYTES)})
export const evidenceConfirmSchema=z.object({storagePath:z.string().min(10).max(500),mimeType:z.enum(allowedEvidenceMimeTypes),sizeBytes:z.number().int().positive().max(MAX_EVIDENCE_BYTES),sessionId:z.string().uuid().nullable(),elementId:z.string().uuid().nullable(),moment:z.enum(['antes','durante','despues']).nullable(),comment:z.string().trim().max(1000).nullable(),privacy:z.enum(['privado','entrenadores','familia']),representativeFrameSeconds:z.number().min(0).nullable()})
export function validateEvidencePolicy(sizeBytes:number,mimeType:string,settings:{maximumMb:number;allowedMimeTypes:string[]}){if(sizeBytes>settings.maximumMb*1024*1024)return `El archivo supera el límite de ${settings.maximumMb} MB de la organización`;if(!settings.allowedMimeTypes.includes(mimeType))return 'El formato no está permitido por la organización';return null}
