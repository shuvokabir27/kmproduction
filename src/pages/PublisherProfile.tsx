import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Clock, Newspaper, Award, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

interface PublisherData {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  age: number | null;
  experience: string | null;
  fun_fact: string | null;
  slug: string | null;
}

interface NewsItem {
  id: string;
  title: string;
  excerpt: string | null;
  featured_image_url: string | null;
  category: string;
  published_at: string | null;
  post_number: number | null;
}

export default function PublisherProfile() {
  const { publisherId } = useParams();
  const navigate = useNavigate();

  const { data: publisher, isLoading } = useQuery({
    queryKey: ["publisher-profile", publisherId],
    queryFn: async () => {
      // Try slug first, then id
      let query = supabase.from("news_publishers").select("*");
      if (publisherId?.includes("-")) {
        query = query.eq("id", publisherId);
      } else {
        query = query.eq("slug", publisherId);
      }
      const { data, error } = await query.single();
      if (error) throw error;
      return data as PublisherData;
    },
    enabled: !!publisherId,
  });

  const { data: publisherNews } = useQuery({
    queryKey: ["publisher-news", publisher?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, title, excerpt, featured_image_url, category, published_at, post_number")
        .eq("publisher_id", publisher!.id)
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as NewsItem[];
    },
    enabled: !!publisher?.id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["public-news-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as { value: string; label: string }[];
    },
  });

  const getCatLabel = (val: string) => categories.find(c => c.value === val)?.label || val;

  const handleNewsClick = (news: NewsItem) => {
    if (news.post_number) {
      navigate(`/news/${news.category}/${news.post_number}`);
    } else {
      navigate(`/news?id=${news.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-4">
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="h-8 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!publisher) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Newspaper className="h-16 w-16 text-gray-300" />
        <p className="text-gray-500">প্রকাশক খুঁজে পাওয়া যায়নি</p>
        <Button variant="outline" onClick={() => navigate("/news")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> নিউজে ফিরে যান
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Tiro Bangla', 'Noto Serif Bengali', serif" }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 gap-1.5 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> পেছনে যান
        </Button>

        {/* Profile Header */}
        <div className="border-t-[3px] border-gray-900 pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Photo */}
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg flex-shrink-0">
              {publisher.photo_url ? (
                <img src={publisher.photo_url} alt={publisher.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <span className="text-5xl">✍️</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-1">
                {publisher.name}
              </h1>
              <p className="text-sm text-gray-500 mb-3">
                📰 দৈনিক ইন্তেকাল — প্রকাশক
              </p>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {publisher.age && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    🎂 বয়স: {publisher.age} বছর
                  </Badge>
                )}
                {publisherNews && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Newspaper className="h-3 w-3" /> {publisherNews.length}টি নিউজ প্রকাশিত
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio & Details */}
        <div className="space-y-6 py-6 border-t border-gray-200">
          {/* Bio */}
          {publisher.bio && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> পরিচিতি
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {publisher.bio}
              </p>
            </div>
          )}

          {/* Experience */}
          {publisher.experience && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" /> অভিজ্ঞতা
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {publisher.experience}
              </p>
            </div>
          )}

          {/* Fun Fact */}
          {publisher.fun_fact && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" /> মজার তথ্য
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {publisher.fun_fact}
              </p>
            </div>
          )}
        </div>

        {/* Published News */}
        {publisherNews && publisherNews.length > 0 && (
          <div className="border-t-[2px] border-gray-900 pt-6">
            <h2 className="text-xl font-black text-gray-900 mb-4">
              {publisher.name}-এর প্রকাশিত নিউজ
            </h2>
            <div className="space-y-0">
              {publisherNews.map((news, idx) => (
                <article
                  key={news.id}
                  className={`cursor-pointer group py-4 ${idx > 0 ? "border-t border-gray-200" : ""}`}
                  onClick={() => handleNewsClick(news)}
                >
                  <div className="flex gap-3">
                    {news.featured_image_url && (
                      <div className="w-24 h-20 md:w-28 md:h-24 flex-shrink-0 overflow-hidden border border-gray-200">
                        <img
                          src={news.featured_image_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70 mb-0.5 block">
                        {getCatLabel(news.category)}
                      </span>
                      <h3 className="font-bold text-sm md:text-[15px] text-gray-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {news.title}
                      </h3>
                      {news.excerpt && (
                        <p className="text-xs text-gray-600 line-clamp-1 mt-1 hidden md:block">
                          {news.excerpt}
                        </p>
                      )}
                      {news.published_at && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(news.published_at), "dd MMMM yyyy", { locale: bn })}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 mt-8 pt-4 pb-8 text-center">
          <Button variant="outline" size="sm" onClick={() => navigate("/news")} className="gap-1.5">
            <Newspaper className="h-4 w-4" /> সকল নিউজ দেখুন
          </Button>
        </div>
      </div>
    </div>
  );
}
