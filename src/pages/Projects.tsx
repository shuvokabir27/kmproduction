import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

const projects = [
  { name: "ই-কমার্স প্ল্যাটফর্ম", description: "অনলাইন শপিং ওয়েবসাইট", progress: 72, members: 4, deadline: "১৫ এপ্রিল", status: "সক্রিয়" },
  { name: "মোবাইল অ্যাপ", description: "iOS ও Android অ্যাপ", progress: 45, members: 3, deadline: "২০ মে", status: "সক্রিয়" },
  { name: "CRM সিস্টেম", description: "কাস্টমার রিলেশনশিপ ম্যানেজমেন্ট", progress: 90, members: 5, deadline: "৫ এপ্রিল", status: "সক্রিয়" },
  { name: "ব্লগ পোর্টাল", description: "কন্টেন্ট ম্যানেজমেন্ট সিস্টেম", progress: 100, members: 2, deadline: "সম্পন্ন", status: "সম্পন্ন" },
  { name: "অ্যানালিটিক্স ড্যাশবোর্ড", description: "ডেটা ভিজ্যুয়ালাইজেশন টুল", progress: 20, members: 3, deadline: "৩০ জুন", status: "পরিকল্পনা" },
];

const Projects = () => {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">প্রজেক্টসমূহ</h1>
            <p className="text-muted-foreground text-sm mt-1">সকল প্রজেক্ট ট্র্যাক করুন</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            নতুন প্রজেক্ট
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project, i) => (
            <motion.div
              key={project.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="p-5 bg-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{project.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                    project.status === "সক্রিয়"
                      ? "bg-primary/10 text-primary"
                      : project.status === "সম্পন্ন"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}>
                    {project.status}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">অগ্রগতি</span>
                    <span className="text-foreground font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                  <div className="flex -space-x-1.5">
                    {Array.from({ length: Math.min(project.members, 4) }).map((_, j) => (
                      <div key={j} className="h-6 w-6 rounded-full bg-primary/15 border-2 border-card flex items-center justify-center">
                        <span className="text-[9px] text-primary font-medium">{j + 1}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {project.deadline}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Projects;
