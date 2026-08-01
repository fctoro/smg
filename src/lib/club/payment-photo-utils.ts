import { supabase } from "@/lib/supabaseClient";

const MAX_PAYMENT_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PAYMENT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export function validatePaymentPhotoFile(file: File | null) {
  if (!file) {
    return { valid: false, error: "Aucun fichier sélectionné." };
  }

  if (!ALLOWED_PAYMENT_PHOTO_TYPES.includes(file.type)) {
    return { valid: false, error: "Format non pris en charge. Utilisez JPG, PNG ou WEBP." };
  }

  if (file.size > MAX_PAYMENT_PHOTO_SIZE) {
    return { valid: false, error: "La photo doit être inférieure ou égale à 5 Mo." };
  }

  return { valid: true };
}

export function getPaymentPhotoPreviewUrl(file: File | null) {
  if (!file) return null;
  return URL.createObjectURL(file);
}

export async function uploadPaymentPhotoToSupabase(file: File | null) {
  if (!file) return null;

  try {
    const extension = file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
    const fileName = `payment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "videos";

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { contentType: file.type });

    if (uploadError || !uploadData) {
      console.error("Erreur d’upload du justificatif de paiement:", uploadError);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrlData.publicUrl || null;
  } catch (error) {
    console.error("Erreur d’upload du justificatif de paiement:", error);
    return null;
  }
}

export function extractPhotoUrlFromRemark(remark: string | undefined): string | null {
  if (!remark) return null;
  
  const match = remark.match(/\[JUSTIFICATIF:(https?:\/\/[^\]]+)\]/);
  if (match) {
    return match[1];
  }
  
  return null;
}