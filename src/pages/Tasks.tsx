import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

type TaskStatus = "todo" | "in_progress" | "done";

interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  status: TaskStatus;
}

const initialTasks: Task[] = [
  { id: "1", title: "হোমপেজ ডিজাইন", assignee: "রাহুল", priority: "high", status: "todo" },
  { id: "2", title: "ব্যাকএন্ড API তৈরি", assignee: "সুমন", priority: "high", status: "in_progress" },
  { id: "3", title: "ইউজার টেস্টিং", assignee: "নাফিসা", priority: "medium", status: "todo" },
  { id: "4", title: "ডাটাবেস স্কিমা", assignee: "তানভীর", priority: "low", status: "done" },
  { id: "5", title: "লগইন পেজ", assignee: "রাহুল", priority: "medium", status: "in_progress" },
  { id: "6", title: "ডকুমেন্টেশন", assignee: "সুমন", priority: "low", status: "todo" },
];

const columns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "মুলতুবি", color: "bg-warning" },
  { key: "in_progress", label: "চলমান", color: "bg-primary" },
  { key: "done", label: "সম্পন্ন", color: "bg-success" },
];

const priorityColors = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-success",
};

const priorityLabels = {
  high: "জরুরি",
  medium: "মাঝারি",
  low: "সাধারণ",
};

const Tasks = () => {
  const [tasks] = useState<Task[]>(initialTasks);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">টাস্কসমূহ</h1>
            <p className="text-muted-foreground text-sm mt-1">কানবান বোর্ডে টাস্ক ম্যানেজ করুন</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            নতুন টাস্ক
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  <span className="text-sm font-medium text-foreground">{col.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{colTasks.length}</span>
                </div>
                <div className="space-y-2.5">
                  {colTasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className={`p-4 bg-card border-border/50 hover:border-primary/30 transition-colors border-l-2 ${priorityColors[task.priority]} cursor-pointer`}>
                        <div className="flex items-start justify-between">
                          <h3 className="text-sm font-medium text-foreground">{task.title}</h3>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground -mr-1 -mt-1">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-[10px] text-primary font-medium">
                                {task.assignee.charAt(0)}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{task.assignee}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            task.priority === "high"
                              ? "bg-destructive/10 text-destructive"
                              : task.priority === "medium"
                              ? "bg-warning/10 text-warning"
                              : "bg-success/10 text-success"
                          }`}>
                            {priorityLabels[task.priority]}
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Tasks;
