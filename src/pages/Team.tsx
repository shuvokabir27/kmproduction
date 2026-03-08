import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Mail, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

const members = [
  { name: "রাহুল আহমেদ", role: "ফ্রন্টএন্ড ডেভেলপার", email: "rahul@team.com", status: "online", tasks: 5 },
  { name: "সুমন হাসান", role: "ব্যাকএন্ড ডেভেলপার", email: "sumon@team.com", status: "online", tasks: 3 },
  { name: "নাফিসা আক্তার", role: "QA ইঞ্জিনিয়ার", email: "nafisa@team.com", status: "offline", tasks: 4 },
  { name: "তানভীর রহমান", role: "DevOps ইঞ্জিনিয়ার", email: "tanvir@team.com", status: "offline", tasks: 2 },
  { name: "মিথিলা পারভীন", role: "UI/UX ডিজাইনার", email: "mithila@team.com", status: "online", tasks: 6 },
  { name: "ফারুক হোসেন", role: "প্রজেক্ট ম্যানেজার", email: "faruk@team.com", status: "offline", tasks: 8 },
];

const Team = () => {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">টিম মেম্বার</h1>
            <p className="text-muted-foreground text-sm mt-1">আপনার টিমের সদস্যদের ম্যানেজ করুন</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            মেম্বার যোগ করুন
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member, i) => (
            <motion.div
              key={member.email}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="p-5 bg-card border-border/50 hover:border-primary/30 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20">
                        <span className="text-primary font-semibold text-sm">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                        member.status === "online" ? "bg-success" : "bg-muted-foreground/40"
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{member.name}</h3>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {member.email}
                  </div>
                  <span className="text-xs text-primary font-medium">{member.tasks} টাস্ক</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Team;
