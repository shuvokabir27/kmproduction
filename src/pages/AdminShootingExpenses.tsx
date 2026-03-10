import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Receipt, TrendingUp, Utensils, Car, Package, MoreHorizontal, Pencil } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { bn } from "date-fns/locale";

const CATEGORIES = [
  { value: "food", label: "খাবার", icon: Utensils, color: "text-orange-400" },
  { value: "transport", label: "গাড়িভাড়া", icon: Car, color: "text-blue-400" },
  { value: "props", label: "পপস", icon: Package, color: "text-purple-400" },
  { value: "other", label: "অন্যান্য", icon: MoreHorizontal, color: "text-muted-foreground" },
] as const;

export default function AdminShootingExpenses() {
  const queryClient = useQueryClient();
  const [selectedShooting, setSelectedShooting] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Form state
  const [formShootingId, setFormShootingId] = useState("");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Fetch shootings
  const { data: shootings } = useQuery({
    queryKey: ["shootings-for-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shootings")
        .select("id, name, shoot_date")
        .order("shoot_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch expenses
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["shooting-expenses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shooting_expenses")
        .select("*, shootings(name, shoot_date)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Add/Edit expense
  const saveExpense = useMutation({
    mutationFn: async () => {
      if (editingExpense) {
        const { error } = await (supabase as any).from("shooting_expenses").update({
          shooting_id: formShootingId,
          category: formCategory,
          amount: Number(formAmount),
          description: formDescription || null,
          expense_date: formDate,
        }).eq("id", editingExpense.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("shooting_expenses").insert({
          shooting_id: formShootingId,
          category: formCategory,
          amount: Number(formAmount),
          description: formDescription || null,
          expense_date: formDate,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shooting-expenses"] });
      toast({ title: editingExpense ? "খরচ আপডেট হয়েছে" : "খরচ যুক্ত হয়েছে" });
      closeDialog();
    },
    onError: () => toast({ title: "ত্রুটি হয়েছে", variant: "destructive" }),
  });

  // Delete expense
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("shooting_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shooting-expenses"] });
      toast({ title: "খরচ মুছে ফেলা হয়েছে" });
    },
  });

  const openEditDialog = (expense: any) => {
    setEditingExpense(expense);
    setFormShootingId(expense.shooting_id);
    setFormCategory(expense.category);
    setFormAmount(String(expense.amount));
    setFormDescription(expense.description || "");
    setFormDate(expense.expense_date);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingExpense(null);
    setFormShootingId("");
    setFormCategory("");
    setFormAmount("");
    setFormDescription("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
  };

  // Filter expenses by shooting
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    if (selectedShooting) return expenses.filter((e: any) => e.shooting_id === selectedShooting);
    return expenses;
  }, [expenses, selectedShooting]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    if (!expenses) return { total: 0, byCategory: {} as Record<string, number>, byShooting: [] as any[] };
    const monthStart = startOfMonth(parseISO(selectedMonth + "-01"));
    const monthEnd = endOfMonth(monthStart);

    const monthExpenses = expenses.filter((e: any) => {
      const d = parseISO(e.expense_date);
      return d >= monthStart && d <= monthEnd;
    });

    const total = monthExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const byCategory: Record<string, number> = {};
    monthExpenses.forEach((e: any) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    });

    const shootingMap: Record<string, { name: string; total: number }> = {};
    monthExpenses.forEach((e: any) => {
      if (!shootingMap[e.shooting_id]) {
        shootingMap[e.shooting_id] = { name: e.shootings?.name || "N/A", total: 0 };
      }
      shootingMap[e.shooting_id].total += Number(e.amount);
    });

    return { total, byCategory, byShooting: Object.values(shootingMap) };
  }, [expenses, selectedMonth]);

  // Per-shooting totals for the list tab
  const shootingTotals = useMemo(() => {
    if (!expenses) return [];
    const map: Record<string, { name: string; date: string; total: number; categories: Record<string, number> }> = {};
    expenses.forEach((e: any) => {
      if (!map[e.shooting_id]) {
        map[e.shooting_id] = {
          name: e.shootings?.name || "N/A",
          date: e.shootings?.shoot_date || "",
          total: 0,
          categories: {},
        };
      }
      map[e.shooting_id].total += Number(e.amount);
      map[e.shooting_id].categories[e.category] = (map[e.shooting_id].categories[e.category] || 0) + Number(e.amount);
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses]);

  const getCategoryLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">শুটিং খরচ</h1>
            <p className="text-sm text-muted-foreground">শুটিং অনুযায়ী খরচ ব্যবস্থাপনা</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> খরচ যুক্ত</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingExpense ? "খরচ সম্পাদনা করুন" : "নতুন খরচ যুক্ত করুন"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={formShootingId} onValueChange={setFormShootingId}>
                  <SelectTrigger><SelectValue placeholder="শুটিং নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {shootings?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({format(parseISO(s.shoot_date), "dd MMM yyyy", { locale: bn })})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue placeholder="ক্যাটাগরি" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="পরিমাণ (৳)"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
                <Textarea
                  placeholder="বিবরণ (ঐচ্ছিক)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
                <Button
                  className="w-full"
                  disabled={!formShootingId || !formCategory || !formAmount || saveExpense.isPending}
                  onClick={() => saveExpense.mutate()}
                >
                  {saveExpense.isPending ? "সেভ হচ্ছে..." : editingExpense ? "আপডেট করুন" : "যুক্ত করুন"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="by-shooting" className="space-y-4">
          <TabsList>
            <TabsTrigger value="by-shooting"><Receipt className="h-4 w-4 mr-1" /> শুটিং অনুযায়ী</TabsTrigger>
            <TabsTrigger value="monthly"><TrendingUp className="h-4 w-4 mr-1" /> মাসিক হিসাব</TabsTrigger>
            <TabsTrigger value="all">সব খরচ</TabsTrigger>
          </TabsList>

          {/* Per Shooting Tab */}
          <TabsContent value="by-shooting" className="space-y-4">
            {shootingTotals.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">কোনো খরচ নেই</CardContent></Card>
            ) : (
              shootingTotals.map((s, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex justify-between">
                      <span>{s.name}</span>
                      <span className="text-primary">৳{s.total.toLocaleString("bn-BD")}</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {s.date && format(parseISO(s.date), "dd MMM yyyy", { locale: bn })}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {CATEGORIES.map((cat) => {
                        const amt = s.categories[cat.value] || 0;
                        if (!amt) return null;
                        const Icon = cat.icon;
                        return (
                          <div key={cat.value} className="flex items-center gap-1.5 text-sm">
                            <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
                            <span className="text-muted-foreground">{cat.label}:</span>
                            <span>৳{amt.toLocaleString("bn-BD")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-48"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const amt = monthlySummary.byCategory[cat.value] || 0;
                return (
                  <Card key={cat.value}>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Icon className={`h-5 w-5 mx-auto mb-1 ${cat.color}`} />
                      <p className="text-xs text-muted-foreground">{cat.label}</p>
                      <p className="text-lg font-bold">৳{amt.toLocaleString("bn-BD")}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">মোট খরচ: ৳{monthlySummary.total.toLocaleString("bn-BD")}</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlySummary.byShooting.length === 0 ? (
                  <p className="text-sm text-muted-foreground">এই মাসে কোনো খরচ নেই</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>শুটিং</TableHead>
                        <TableHead className="text-right">মোট</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySummary.byShooting.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell className="text-right">৳{s.total.toLocaleString("bn-BD")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Expenses Tab */}
          <TabsContent value="all" className="space-y-4">
            <Select value={selectedShooting || "all"} onValueChange={(v) => setSelectedShooting(v === "all" ? "" : v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="সব শুটিং" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব শুটিং</SelectItem>
                {shootings?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>শুটিং</TableHead>
                      <TableHead>ক্যাটাগরি</TableHead>
                      <TableHead>বিবরণ</TableHead>
                      <TableHead className="text-right">পরিমাণ</TableHead>
                      <TableHead>তারিখ</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                    ) : filteredExpenses.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো খরচ নেই</TableCell></TableRow>
                    ) : (
                      filteredExpenses.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.shootings?.name}</TableCell>
                          <TableCell>{getCategoryLabel(e.category)}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">{e.description || "—"}</TableCell>
                          <TableCell className="text-right font-medium">৳{Number(e.amount).toLocaleString("bn-BD")}</TableCell>
                          <TableCell className="text-muted-foreground">{format(parseISO(e.expense_date), "dd MMM", { locale: bn })}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteExpense.mutate(e.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
