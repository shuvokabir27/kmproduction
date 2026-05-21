import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Receipt, UtensilsCrossed, Shirt, Bus, CheckCircle2, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ClientProjectExpensesProps {
  projectId: string;
  clientProfileId: string;
}

const categoryConfig = {
  food: { label: "খাবার", icon: UtensilsCrossed, color: "text-red-400" },
  costume: { label: "কস্টিউম", icon: Shirt, color: "text-pink-400" },
  transport: { label: "যাতায়াত", icon: Bus, color: "text-sky-400" },
};

export function ClientProjectExpenses({ projectId, clientProfileId }: ClientProjectExpensesProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  const { data: expenses = [], refetch } = useQuery({
    queryKey: ["client-project-expenses", projectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_project_expenses")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");
      return data || [];
    },
  });

  const invalidateAll = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["all-client-project-expenses"] });
  };

  const handleAdd = async () => {
    if (!category) {
      toast({ title: "ক্যাটাগরি সিলেক্ট করুন", variant: "destructive" });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast({ title: "পরিমাণ দিন", variant: "destructive" });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("client_project_expenses")
        .insert({
          project_id: projectId,
          client_profile_id: clientProfileId,
          category,
          amount: Number(amount),
          description: description.trim() || null,
          is_paid: isPaid,
        });
      if (error) throw error;

      toast({ title: "খরচ যুক্ত হয়েছে ✓" });
      setCategory("");
      setAmount("");
      setDescription("");
      setIsPaid(true);
      setShowAddForm(false);
      invalidateAll();
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const handleTogglePaid = async (id: string, currentPaid: boolean, expAmount: number) => {
    try {
      const updateData = !currentPaid 
        ? { is_paid: true, paid_amount: expAmount } 
        : { is_paid: false, paid_amount: 0 };
      const { error } = await (supabase as any)
        .from("client_project_expenses")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
      toast({ title: !currentPaid ? "পেইড করা হয়েছে ✓" : "বাকি সেট করা হয়েছে" });
      invalidateAll();
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("client_project_expenses")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "খরচ সরানো হয়েছে" });
      invalidateAll();
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const totalExpense = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const totalPaid = expenses.reduce((s: number, e: any) => s + Number(e.paid_amount || 0), 0);
  const totalDue = totalExpense - totalPaid;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Receipt className="h-4 w-4 text-primary" /> শুটিং খরচ
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs gap-1 h-7"
        >
          <Plus className="h-3 w-3" /> যুক্ত করুন
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-border/50">
          <CardContent className="p-3 space-y-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="ক্যাটাগরি সিলেক্ট করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="food">🍛 খাবার</SelectItem>
                <SelectItem value="costume">👔 কস্টিউম</SelectItem>
                <SelectItem value="transport">🚌 যাতায়াত</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="পরিমাণ (৳)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              className="text-sm"
            />

            <Input
              placeholder="বিবরণ (ঐচ্ছিক)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm"
              maxLength={200}
            />

            {/* Paid/Due toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPaid(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                  isPaid
                    ? "bg-red-500/15 border-red-500/30 text-red-400"
                    : "bg-secondary/30 border-border/30 text-muted-foreground"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> পেইড
              </button>
              <button
                type="button"
                onClick={() => setIsPaid(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                  !isPaid
                    ? "bg-red-500/15 border-red-500/30 text-red-400"
                    : "bg-secondary/30 border-border/30 text-muted-foreground"
                }`}
              >
                <Clock className="h-3.5 w-3.5" /> বাকি
              </button>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} className="gap-1 text-xs flex-1">
                <Plus className="h-3 w-3" /> যুক্ত করুন
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowAddForm(false); setCategory(""); setAmount(""); setDescription(""); setIsPaid(true); }}
                className="text-xs"
              >
                বাতিল
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {expenses.length > 0 && (
        <div className="space-y-2">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {expenses.map((exp: any) => {
                  const config = categoryConfig[exp.category as keyof typeof categoryConfig];
                  const Icon = config?.icon || Receipt;
                   const paid = exp.is_paid !== false;
                   const paidAmt = Number(exp.paid_amount || 0);
                   const expAmt = Number(exp.amount || 0);
                   const isPartial = !paid && paidAmt > 0 && paidAmt < expAmt;
                   return (
                    <div key={exp.id} className="flex items-center gap-2.5 px-3 py-2.5">
                      <div className="h-8 w-8 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0">
                        <Icon className={`h-4 w-4 ${config?.color || "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground">{config?.label || exp.category}</span>
                          {paid ? (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-red-500/30 text-red-400 bg-red-500/10">পেইড</Badge>
                          ) : isPartial ? (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-blue-500/30 text-blue-400 bg-blue-500/10">আংশিক (৳{paidAmt.toLocaleString("bn-BD")})</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-red-500/30 text-red-400 bg-red-500/10">বাকি</Badge>
                          )}
                        </div>
                        {exp.description && <div className="text-[10px] text-muted-foreground truncate">{exp.description}</div>}
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0">৳{expAmt.toLocaleString("bn-BD")}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!paid && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePaid(exp.id, paid, expAmt)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="পেইড করুন"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {paid && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePaid(exp.id, paid, expAmt)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="বাকি করুন"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(exp.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">মোট শুটিং খরচ</span>
                <span className="text-sm font-bold text-foreground">৳{totalExpense.toLocaleString("bn-BD")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-red-400">পেইড</span>
                <span className="text-xs font-semibold text-red-400">৳{totalPaid.toLocaleString("bn-BD")}</span>
              </div>
              {totalDue > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-red-400">বাকি</span>
                  <span className="text-xs font-semibold text-red-400">৳{totalDue.toLocaleString("bn-BD")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {expenses.length === 0 && !showAddForm && (
        <p className="text-xs text-muted-foreground text-center py-3">
          কোনো খরচ যুক্ত করা হয়নি। "যুক্ত করুন" বাটনে ক্লিক করুন।
        </p>
      )}
    </div>
  );
}
