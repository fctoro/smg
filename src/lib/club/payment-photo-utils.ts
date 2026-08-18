import { supabase } from "@/lib/supabaseClient";

const MAX_PAYMENT_PHOTO_SIZE = 10 * 1024 * 1024; // 10 Mo

export function isPdfProof(urlOrFileName: string | null | undefined): boolean {
  if (!urlOrFileName) return false;
  const lower = urlOrFileName.toLowerCase();
  return lower.includes(".pdf") || lower.startsWith("data:application/pdf");
}

export function validatePaymentPhotoFile(file: File | null) {
  if (!file) {
    return { valid: false, error: "Aucun fichier sélectionné." };
  }

  if (file.size > MAX_PAYMENT_PHOTO_SIZE) {
    return { valid: false, error: "Le fichier justificatif doit être inférieur ou égal à 10 Mo." };
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
    let extension = "jpg";
    if (file.name && file.name.includes(".")) {
      const parts = file.name.split(".");
      extension = parts[parts.length - 1].toLowerCase();
    } else if (file.type === "application/pdf") {
      extension = "pdf";
    } else if (file.type === "image/png") {
      extension = "png";
    } else if (file.type === "image/webp") {
      extension = "webp";
    } else if (file.type.startsWith("image/")) {
      extension = file.type.split("/")[1] || "jpg";
    }

    const fileName = `payment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "videos";

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { contentType: file.type || "application/octet-stream" });

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