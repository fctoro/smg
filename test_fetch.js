async function test() {
  try {
    const url = 'https://xsfmhqdgqowgfoppohan.supabase.co/storage/v1/object/public/videos/documents/102-document_photo_id-1784391761232-WhatsApp_Image_2026-07-18_at_12.08.40_1_.jpeg';
    const res = await fetch(url);
    console.log(res.status, res.statusText);
  } catch(e) {
    console.log('Fetch error:', e.message);
  }
}
test();
