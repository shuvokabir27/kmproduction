ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS shop_name TEXT DEFAULT 'কে এম শপ',
  ADD COLUMN IF NOT EXISTS shop_tagline TEXT DEFAULT 'কুয়াকাটার সেরা পণ্য সম্ভার, সরাসরি আপনার দোরগোড়ায় পৌঁছে দিচ্ছি।',
  ADD COLUMN IF NOT EXISTS shop_address TEXT DEFAULT 'কুয়াকাটা, পটুয়াখালী',
  ADD COLUMN IF NOT EXISTS shop_email TEXT,
  ADD COLUMN IF NOT EXISTS shop_copyright TEXT DEFAULT 'কে এম শপ। সর্বস্বত্ব সংরক্ষিত।';