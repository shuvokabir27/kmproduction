
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Camera',
  price_label TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active services"
  ON public.services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default services
INSERT INTO public.services (title, description, icon, category, features, sort_order, is_featured, price_label) VALUES
('হোটেল বিজ্ঞাপন', 'আপনার হোটেল বা রিসোর্টের জন্য প্রফেশনাল ভিডিও ও ফটোগ্রাফি। আকর্ষণীয় বিজ্ঞাপন তৈরি করে আপনার ব্যবসায় গ্রাহক আনুন।', 'Building', 'বিজ্ঞাপন', '["প্রফেশনাল ভিডিওগ্রাফি", "ড্রোন শট", "ফটো শুটিং", "সোশ্যাল মিডিয়া কনটেন্ট", "ভিডিও এডিটিং"]', 1, true, 'যোগাযোগ করুন'),
('বিয়ে বাড়ি ছবি ও ভিডিও', 'আপনার জীবনের সবচেয়ে সুন্দর মুহূর্তগুলো ধরে রাখুন প্রফেশনাল ফটোগ্রাফি ও সিনেমাটিক ভিডিওগ্রাফিতে।', 'Heart', 'ইভেন্ট', '["সিনেমাটিক ওয়েডিং ভিডিও", "প্রি-ওয়েডিং শুট", "ফটো অ্যালবাম", "হাইলাইট রিল", "ড্রোন কভারেজ"]', 2, true, 'যোগাযোগ করুন'),
('নাটক নির্মাণ', 'টেলিভিশন ও ইউটিউবের জন্য উচ্চমানের নাটক নির্মাণ। স্ক্রিপ্ট থেকে শুরু করে পোস্ট-প্রোডাকশন পর্যন্ত সম্পূর্ণ সেবা।', 'Clapperboard', 'প্রোডাকশন', '["স্ক্রিপ্ট রাইটিং", "কাস্টিং সাপোর্ট", "প্রফেশনাল শুটিং", "পোস্ট-প্রোডাকশন", "কালার গ্রেডিং"]', 3, true, 'যোগাযোগ করুন'),
('ভিডিও এডিটিং', 'যেকোনো ধরনের ভিডিও এডিটিং সেবা। কালার গ্রেডিং, মোশন গ্রাফিক্স, সাউন্ড ডিজাইন সহ সম্পূর্ণ পোস্ট-প্রোডাকশন।', 'Film', 'এডিটিং', '["কালার গ্রেডিং", "মোশন গ্রাফিক্স", "সাউন্ড ডিজাইন", "VFX", "সাবটাইটেল"]', 4, false, 'যোগাযোগ করুন'),
('ব্যবসায়িক বিজ্ঞাপন', 'আপনার পণ্য বা সেবার জন্য আকর্ষণীয় বিজ্ঞাপন তৈরি। সোশ্যাল মিডিয়া থেকে শুরু করে টেলিভিশন বিজ্ঞাপন পর্যন্ত।', 'Megaphone', 'বিজ্ঞাপন', '["কনসেপ্ট ডেভেলপমেন্ট", "স্ক্রিপ্ট রাইটিং", "প্রোডাকশন", "পোস্ট-প্রোডাকশন", "মাল্টি-প্ল্যাটফর্ম ডেলিভারি"]', 5, false, 'যোগাযোগ করুন'),
('ফটোগ্রাফি', 'ইভেন্ট, পোর্ট্রেট, প্রোডাক্ট ও ল্যান্ডস্কেপ ফটোগ্রাফি। প্রফেশনাল ক্যামেরা ও লেন্স দিয়ে সেরা মানের ছবি।', 'Camera', 'ফটোগ্রাফি', '["ইভেন্ট কভারেজ", "পোর্ট্রেট শুট", "প্রোডাক্ট ফটোগ্রাফি", "আউটডোর শুট", "ফটো রিটাচিং"]', 6, false, 'যোগাযোগ করুন');
