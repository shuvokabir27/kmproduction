import { useAuth } from "@/hooks/useAuth";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eraser, Undo2, Trash2, Pen, Minus, Plus } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#000000", "#6b7280", "#ffffff",
];

const ScriptDrawing = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const strokesRef = useRef<ImageData[]>([]);

  const [penColor, setPenColor] = useState("#ef4444");
  const [penSize, setPenSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  const { data: script, isLoading: scriptLoading } = useQuery({
    queryKey: ["script-draw", id],
    queryFn: async () => {
      const { data } = await supabase.from("scripts").select("*").eq("id", id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Resize canvas to match container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Save current drawing
    const ctx = canvas.getContext("2d");
    let imageData: ImageData | null = null;
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = container.scrollHeight * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${container.scrollHeight}px`;

    if (ctx) {
      ctx.scale(dpr, dpr);
      // Restore drawing
      if (imageData) {
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }, []);

  // Load saved drawing from localStorage
  const loadSavedDrawing = useCallback(() => {
    if (!id || !canvasRef.current) return;
    const saved = localStorage.getItem(`script-drawing-${id}`);
    if (!saved) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
    };
    img.src = saved;
  }, [id]);

  // Save drawing to localStorage
  const saveDrawing = useCallback(() => {
    if (!id || !canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      localStorage.setItem(`script-drawing-${id}`, dataUrl);
    } catch {}
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      resizeCanvas();
      setTimeout(loadSavedDrawing, 100);
    }, 300);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      clearTimeout(timer);
    };
  }, [resizeCanvas, loadSavedDrawing, script]);

  // Watch container for height changes (content might render late)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scrollContainer = containerRef.current?.parentElement;
    const scrollTop = scrollContainer?.scrollTop || 0;

    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    isDrawing.current = true;
    lastPoint.current = point;

    // Save state for undo
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      strokesRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (strokesRef.current.length > 50) strokesRef.current.shift();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current || !lastPoint.current) return;
    const point = getCanvasPoint(e);
    if (!point) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = isEraser ? "#ffffff" : penColor;
    ctx.lineWidth = isEraser ? penSize * 4 : penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.stroke();
    lastPoint.current = point;
  };

  const stopDrawing = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      lastPoint.current = null;
      saveDrawing();
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || strokesRef.current.length === 0) return;
    const prev = strokesRef.current.pop()!;
    ctx.putImageData(prev, 0, 0);
    saveDrawing();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // Save for undo
    strokesRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveDrawing();
  };

  if (loading || scriptLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (!script) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">স্ক্রিপ্ট পাওয়া যায়নি</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-3 py-2 flex items-center gap-2 flex-wrap shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/scripts/${id}`)} className="gap-1.5 text-xs">
          <ArrowLeft className="h-4 w-4" /> ফিরে যান
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setPenColor(c); setIsEraser(false); }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                !isEraser && penColor === c ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border/50"
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Pen size */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPenSize(Math.max(1, penSize - 1))}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground w-4 text-center">{penSize}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPenSize(Math.min(20, penSize + 1))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Tools */}
        <Button
          variant={isEraser ? "default" : "outline"}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setIsEraser(!isEraser)}
        >
          <Eraser className="h-3.5 w-3.5" /> ইরেজার
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleUndo}>
          <Undo2 className="h-3.5 w-3.5" /> আনডু
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={handleClear}>
          <Trash2 className="h-3.5 w-3.5" /> সব মুছুন
        </Button>

        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Pen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{script.title}</span>
        </div>
      </div>

      {/* Drawing area */}
      <div className="flex-1 overflow-auto bg-muted/30">
        <div className="flex justify-center py-6 px-4">
          <div className="relative w-full max-w-[816px]">
            {/* Script content (read-only, non-selectable) */}
            <div
              ref={containerRef}
              className="
                w-full bg-white shadow-2xl border border-gray-200/50 rounded-sm
                px-[60px] md:px-[80px] py-[60px]
                text-gray-900
                text-[15px] leading-[1.8]
                [&_h1]:text-[24px] [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-gray-900 [&_h1]:leading-tight
                [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-gray-800 [&_h2]:leading-tight [&_h2]:border-b [&_h2]:border-gray-200 [&_h2]:pb-1
                [&_p]:mb-3 [&_p]:leading-[1.8]
                [&_ul]:list-disc [&_ul]:pl-8 [&_ul]:mb-3
                [&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:mb-3
                [&_li]:mb-1.5 [&_li]:leading-[1.7]
                [&_strong]:font-bold [&_em]:italic [&_u]:underline
              "
              style={{
                fontFamily: "'Noto Sans Bengali', 'Kalpurush', sans-serif",
                wordBreak: "break-word",
                minHeight: "1056px",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
              dangerouslySetInnerHTML={{ __html: script.content || "" }}
            />

            {/* Canvas overlay */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{
                cursor: isEraser ? "cell" : "crosshair",
                touchAction: "none",
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptDrawing;
