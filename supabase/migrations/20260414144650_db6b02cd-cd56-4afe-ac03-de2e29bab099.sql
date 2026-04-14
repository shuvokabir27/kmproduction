
-- Create landing page sections table
CREATE TABLE public.landing_page_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL,
  title TEXT,
  content TEXT,
  image_url TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_page_sections ENABLE ROW LEVEL SECURITY;

-- Public can view active sections
CREATE POLICY "Anyone can view active landing sections"
ON public.landing_page_sections
FOR SELECT
USING (is_active = true);

-- Product admins can manage sections
CREATE POLICY "Product admins can manage landing sections"
ON public.landing_page_sections
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'product_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'product_admin'::app_role));

-- Admins can also manage
CREATE POLICY "Admins can manage landing sections"
ON public.landing_page_sections
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default content
INSERT INTO public.landing_page_sections (section_key, title, content, icon, sort_order) VALUES
('hero', 'খাঁটি তালের গুড়', 'প্রকৃতির আশীর্বাদে তৈরি, খাঁটি ও ভেজালমুক্ত তালের গুড়। গ্রাম বাংলার ঐতিহ্যবাহী স্বাদ এখন আপনার হাতের কাছে।', '🌴', 0),
('benefit_1', 'প্রাকৃতিক মিষ্টি', 'তালের গুড় একটি প্রাকৃতিক মিষ্টি যা চিনির বিকল্প হিসেবে ব্যবহার করা যায়। এতে কোনো রাসায়নিক পদার্থ নেই।', '🍯', 1),
('benefit_2', 'পুষ্টিগুণ সমৃদ্ধ', 'তালের গুড়ে রয়েছে আয়রন, ক্যালসিয়াম, ম্যাগনেসিয়াম ও পটাসিয়াম যা শরীরের জন্য অত্যন্ত উপকারী।', '💪', 2),
('benefit_3', 'রোগ প্রতিরোধ ক্ষমতা বৃদ্ধি', 'নিয়মিত তালের গুড় খেলে শরীরের রোগ প্রতিরোধ ক্ষমতা বাড়ে এবং সর্দি-কাশি থেকে রক্ষা পাওয়া যায়।', '🛡️', 3),
('benefit_4', 'হজম শক্তি বাড়ায়', 'তালের গুড় হজম প্রক্রিয়াকে উন্নত করে এবং পেটের সমস্যা দূর করতে সাহায্য করে।', '✨', 4),
('quality_1', '১০০% খাঁটি ও ভেজালমুক্ত', 'আমাদের তালের গুড় সম্পূর্ণ প্রাকৃতিক উপায়ে তৈরি। কোনো রাসায়নিক বা প্রিজার্ভেটিভ ব্যবহার করা হয় না।', '✅', 5),
('quality_2', 'ঐতিহ্যবাহী পদ্ধতিতে তৈরি', 'গ্রাম বাংলার চিরায়ত পদ্ধতিতে তাল গাছ থেকে রস সংগ্রহ করে জ্বাল দিয়ে গুড় তৈরি করা হয়।', '🏡', 6),
('quality_3', 'সরাসরি গ্রাম থেকে সংগ্রহ', 'মধ্যস্বত্বভোগী ছাড়াই সরাসরি গ্রামের কারিগরদের কাছ থেকে সংগ্রহ করে আপনার কাছে পৌঁছে দিই।', '🚚', 7),
('cta', 'অর্ডার করুন', 'সুস্বাদু ও পুষ্টিকর খাঁটি তালের গুড় অর্ডার করতে এখনই যোগাযোগ করুন।', '📞', 8);
