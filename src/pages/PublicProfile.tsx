import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar } from "lucide-react";

const PublicProfile = () => {
  const { memberId } = useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("member_id", Number(memberId))
        .single();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">লোড হচ্ছে...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">সদস্য পাওয়া যায়নি</h1>
          <Link to="/"><Button variant="outline">হোম পেজে ফিরুন</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 glass-surface sticky top-0 z-40">
        <div className="container max-w-4xl mx-auto flex items-center h-14 px-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> ফিরে যান
            </Button>
          </Link>
        </div>
      </header>

      <div className="container max-w-4xl mx-auto px-4 py-10">
        <Card className="bg-card border-border/50 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5" />
          <div className="px-6 pb-6 -mt-12">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="h-24 w-24 rounded-xl bg-primary/15 flex items-center justify-center border-4 border-card">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={profile.full_name} className="h-24 w-24 rounded-xl object-cover" />
                ) : (
                  <span className="text-primary font-bold text-3xl">{profile.full_name.charAt(0)}</span>
                )}
              </div>
              <div className="pt-2">
                <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
                <p className="text-muted-foreground">{profile.designation || "সদস্য"}</p>
                <span className="text-xs text-primary font-medium mt-1 inline-block bg-primary/10 px-2 py-0.5 rounded-full">
                  ID: {profile.member_id}
                </span>
              </div>
            </div>

            {profile.bio && (
              <p className="text-muted-foreground mt-6 text-sm leading-relaxed">{profile.bio}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {profile.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary" /> {profile.email}
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary" /> {profile.phone}
                </div>
              )}
              {profile.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> {profile.address}
                </div>
              )}
              {profile.designation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-primary" /> {profile.designation}
                </div>
              )}
              {profile.joining_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary" /> যোগদান: {new Date(profile.joining_date).toLocaleDateString("bn-BD")}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PublicProfile;
