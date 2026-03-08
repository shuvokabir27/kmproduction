import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { CheckSquare, Users, FolderKanban, MessageCircle, TrendingUp, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

const stats = [
  { label: "মোট টাস্ক", value: "24", icon: CheckSquare, change: "+3 আজ" },
  { label: "টিম মেম্বার", value: "8", icon: Users, change: "2 অনলাইন" },
  { label: "প্রজেক্ট", value: "5", icon: FolderKanban, change: "3 সক্রিয়" },
  { label: "মেসেজ", value: "12", icon: MessageCircle, change: "5 অপঠিত" },
];

const recentTasks = [
  { title: "UI ডিজাইন সম্পন্ন করুন", assignee: "রাহুল", status: "চলমান", progress: 65 },
  { title: "API ইন্টিগ্রেশন", assignee: "সুমন", status: "চলমান", progress: 40 },
  { title: "টেস্টিং রিপোর্ট", assignee: "নাফিসা", status: "মুলতুবি", progress: 10 },
  { title: "ডেটাবেস মাইগ্রেশন", assignee: "তানভীর", status: "সম্পন্ন", progress: 100 },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ড্যাশবোর্ড</h1>
          <p className="text-muted-foreground text-sm mt-1">আজকের সারসংক্ষেপ দেখুন</p>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <Card className="p-5 bg-card border-border/50 hover:border-primary/30 transition-colors group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.change}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show">
          <Card className="bg-card border-border/50 overflow-hidden">
            <div className="p-5 border-b border-border/50">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                সাম্প্রতিক টাস্কসমূহ
              </h2>
            </div>
            <div className="divide-y divide-border/30">
              {recentTasks.map((task, i) => (
                <motion.div key={i} variants={item} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.assignee}</p>
                  </div>
                  <div className="w-32 hidden sm:block">
                    <Progress value={task.progress} className="h-1.5" />
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    task.status === "সম্পন্ন"
                      ? "bg-success/10 text-success"
                      : task.status === "চলমান"
                      ? "bg-primary/10 text-primary"
                      : "bg-warning/10 text-warning"
                  }`}>
                    {task.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
