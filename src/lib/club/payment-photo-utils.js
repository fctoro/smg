const MAX_PAYMENT_PHOTO_SIZE = 10 * 1024 * 1024;

function isPdfProof(urlOrFileName) {
  if (!urlOrFileName) return false;
  const lower = String(urlOrFileName).toLowerCase();
  return lower.includes(".pdf") || lower.startsWith("data:application/pdf");
}

function validatePaymentPhotoFile(file) {
  if (!file) {
    return { valid: false, error: "Aucun fichier sélectionné." };
  }

  if (file.size > MAX_PAYMENT_PHOTO_SIZE) {
    return { valid: false, error: "Le fichier justificatif doit être inférieur ou égal à 10 Mo." };
  }

  return { valid: true };
}

function getPaymentPhotoPreviewUrl(file) {
  if (!file) return null;
  return URL.createObjectURL(file);
}

module.exports = {
  isPdfProof,
  validatePaymentPhotoFile,
  getPaymentPhotoPreviewUrl,
};
