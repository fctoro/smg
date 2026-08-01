const MAX_PAYMENT_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PAYMENT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

function validatePaymentPhotoFile(file) {
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

function getPaymentPhotoPreviewUrl(file) {
  if (!file) return null;
  return URL.createObjectURL(file);
}

module.exports = {
  validatePaymentPhotoFile,
  getPaymentPhotoPreviewUrl,
};
