import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Home, ExternalLink, MapPin } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { aiApi } from "../../api/aiApi";
import { useAuth } from "../../context/AuthContext";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  isDataQuery?: boolean;
};

export default function AiChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Xin chào! Mình là trợ lý AI của SmartRental. Mình có thể giúp gì cho bạn hôm nay?",
      sender: "ai",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();

  // --- HÀM RENDER TIN NHẮN CHỨA CARD UI VÀ MARKDOWN ---
  const formatText = (t: string): ReactNode => {
    // 1. Loại bỏ các dòng bị đứt khúc chỉ chứa dấu chấm tròn (do AI Gen lỗi format)
    const lines = t.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed !== '•' && trimmed !== '*' && trimmed !== '-';
    });

    return lines.map((line, i) => {
      let parsedLine = line.trim();
      if (!parsedLine) return <div key={i} className="h-1.5" />;

      // Xử lý Headers (### Tiêu đề)
      let isHeader = false;
      if (/^#{1,3}\s+/.test(parsedLine)) {
        isHeader = true;
        parsedLine = parsedLine.replace(/^#{1,3}\s+/, '');
      }

      // Xử lý Lists (- hoặc * hoặc •)
      let isList = false;
      if (/^[-*•]\s*/.test(parsedLine)) {
        isList = true;
        parsedLine = parsedLine.replace(/^[-*•]\s*/, '');
      }

      // Nếu cụm từ là tiêu đề dạng "**Khuyết điểm:**" 
      if (parsedLine.startsWith('**') && parsedLine.includes('**:') && !isList) {
        isHeader = true;
      }

      // Xử lý In Đậm (**bold**)
      const boldParts = parsedLine.split(/(\*\*.*?\*\*)/g);
      const lineContent = boldParts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-bold text-primary">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      // RENDER HEADER
      if (isHeader) {
        return (
          <div key={i} className="font-bold text-primary text-[14px] mt-4 mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/80 inline-block shadow-sm" />
            <span className="uppercase tracking-wide">{lineContent}</span>
          </div>
        );
      }

      // RENDER LIST ITEM
      if (isList) {
        return (
          <div key={i} className="flex items-start gap-2.5 ml-2 mb-2 text-[14px] group">
            <span className="text-primary mt-[5px] text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">✦</span>
            <span className="flex-1 text-foreground/90 leading-relaxed">{lineContent}</span>
          </div>
        );
      }

      // RENDER NORMAL TEXT
      return (
         <div key={i} className="mb-2.5 text-[14px] text-foreground/90 leading-relaxed">
            {lineContent}
         </div>
      );
    });
  };

  const renderMessageWithCards = (text: string): ReactNode => {
    // Regex tìm chuỗi [ROOM_CARD: id | name | price | imageUrl | distance(optional)]
    const regex = /\[ROOM_CARD:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|\]]*?)(?:\s*\|\s*([^\]]*))?\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{formatText(text.substring(lastIndex, match.index))}</span>);
      }

      const [_, roomId, roomName, priceStr, imageUrl, distanceStr] = match;
      const cleanImgUrl = imageUrl.trim();
      const cleanPrice = parseInt(priceStr.trim().replace(/\D/g, '')) || 0;
      const distance = distanceStr ? distanceStr.trim() : null;
      
      parts.push(
        <div key={`card-${match.index}`} className="w-full bg-card border border-border/50 rounded-2xl shadow-lg mt-4 mb-3 overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          {/* Ảnh phòng - Premium Feel */}
          <div className="relative h-40 w-full overflow-hidden bg-muted">
            {cleanImgUrl ? (
              <img 
                src={cleanImgUrl} 
                alt={roomName} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-primary/5">
                <Home className="w-10 h-10 mb-2 opacity-20" />
                <span className="text-[10px] uppercase tracking-widest opacity-50">Hình ảnh đang cập nhật</span>
              </div>
            )}
            <div className="absolute top-3 right-3">
              <div className="bg-background/90 backdrop-blur-md px-3 py-1 rounded-full text-[12px] font-bold text-primary shadow-sm border border-primary/20">
                {cleanPrice.toLocaleString()}đ
              </div>
            </div>
            {/* Badge khoảng cách - chỉ hiển thị khi có data location */}
            {distance && (
              <div className="absolute top-3 left-3">
                <div className="bg-teal-500/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-white shadow-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {distance}
                </div>
              </div>
            )}
          </div>

          {/* Nội dung chi tiết */}
          <div className="p-4">
            <h4 className="font-bold text-foreground text-base mb-1 line-clamp-1">{roomName.trim()}</h4>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-4">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Đang còn trống • Sẵn sàng dọn vào
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-1">
              <Button
                size="sm"
                variant="default"
                className="w-full flex items-center gap-2 text-[11px] h-9 shadow-md shadow-primary/20"
                onClick={() => window.open(`/rooms/${roomId.trim()}`, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Xem chi tiết
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full flex items-center gap-2 text-[11px] h-9 border-primary/20 hover:bg-primary/5 text-primary"
                onClick={() => {
                   setIsOpen(false);
                   window.location.href = `/rooms/${roomId.trim()}`;
                }}
              >
                Liên hệ chủ
              </Button>
            </div>
          </div>
        </div>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`text-end`}>{formatText(text.substring(lastIndex))}</span>);
    }

    return parts.length > 0 ? parts : formatText(text);
  };

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Lắng nghe event mở ChatBot từ bên ngoài
  useEffect(() => {
    const handleOpenAiChat = ((e: CustomEvent) => {
      setIsOpen(true);
      if (e.detail?.question) {
        if (e.detail?.autoSend) {
          // Tự động gửi luôn — không cần user bấm nút
          // displayText: tin nhắn ngắn hiển thị trong chat UI
          setTimeout(() => sendMessage(e.detail.question, e.detail.displayText), 300);
        } else {
          setInput(e.detail.question);
        }
      }
    }) as EventListener;

    window.addEventListener('openAiChat', handleOpenAiChat);
    return () => window.removeEventListener('openAiChat', handleOpenAiChat);
  }, [isAuthenticated]); // cần isAuthenticated vì sendMessage dùng nó

  // Core logic gửi tin nhắn — nhận trực tiếp chuỗi message
  // displayText: (tùy chọn) tin nhắn ngắn hiển thị trong chat, thay vì hiển thị toàn bộ fullMsg
  const sendMessage = async (fullMsg: string, displayText?: string) => {
    if (!fullMsg.trim()) return;

    const lowerMsg = fullMsg.toLowerCase();
    const isGeneralAnalysis = lowerMsg.includes("phân tích") || lowerMsg.includes("tư vấn") || lowerMsg.includes("ưu điểm") || lowerMsg.includes("nhược điểm") || lowerMsg.includes("lời khuyên");
    
    // Kiểm tra xem câu hỏi có mang tính truy vấn dữ liệu không (hỏi giá, hỏi nợ, hoá đơn)
    const isDataQuery = !isGeneralAnalysis && (
        lowerMsg.includes("hoá đơn") || 
        lowerMsg.includes("hóa đơn") ||
        lowerMsg.includes("tiền") ||
        lowerMsg.includes("nợ") ||
        lowerMsg.includes("phòng") ||
        lowerMsg.includes("hợp đồng") ||
        lowerMsg.includes("gần") ||
        lowerMsg.includes("khu vực") ||
        lowerMsg.includes("quanh") ||
        lowerMsg.includes("nearby") ||
        lowerMsg.includes("landmark")
    );

    // Hiển thị tin nhắn ngắn trong UI (nếu có displayText), nhưng gửi fullMsg cho AI
    const newMessage: Message = {
      id: Date.now().toString(),
      text: displayText || fullMsg,
      sender: "user",
      isDataQuery
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    // Biến chứa nội dung thực sự gửi đi cho AI (luôn là fullMsg đầy đủ)
    const userMsg = fullMsg.trim();

    try {
      let replyText = "";

      if (isDataQuery) {
        // Nếu là truy vấn dữ liệu, nhưng chưa đăng nhập
        if (!isAuthenticated) {
          replyText = "Dạ, để tra cứu các số liệu bảo mật (như hóa đơn, hợp đồng), bạn cần đăng nhập trước nhé!";
        } else {
          try {
            const dataRes = await aiApi.queryData(userMsg);
            replyText = dataRes.data;
          } catch (error: any) {
             replyText = error.response?.data?.message || "Xin lỗi, hệ thống truy xuất dữ liệu đang bận.";
          }
        }
      } else {
        // Chat thông thường (hỏi linh tinh, hỏi luật, phân tích phòng)
        try {
          const chatRes = await aiApi.chat(userMsg, "web-session");
          replyText = chatRes.reply;
        } catch (error: any) {
          replyText = error.response?.data?.message || "Xin lỗi, mình đang gặp sự cố kết nối. Vui lòng thử lại sau.";
        }
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: replyText, sender: "ai" },
      ]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Xin lỗi, mình đang gặp sự cố kết nối. Vui lòng thử lại sau.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    await sendMessage(msg);
  };

  return (
    <>
      {/* KHUNG CHAT (Mở ra khi isOpen = true) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-5 duration-300">
          {/* HEADER */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <div>
                <h3 className="font-semibold text-base">SmartRental AI</h3>
                <p className="text-xs opacity-80">Online</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full w-8 h-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* BODY (MESSAGES) */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[400px] min-h-[300px] space-y-4 bg-muted/30">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.sender === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-background border border-border rounded-tl-sm text-foreground"
                  }`}
                  style={{ whiteSpace: "pre-line" }}
                >
                  {msg.sender === "user" ? msg.text : renderMessageWithCards(msg.text)}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2 flex-row">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-background border border-border rounded-tl-sm flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang gõ...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* FOOTER (INPUT) */}
          <div className="p-3 bg-background border-t border-border">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 relative"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi..."
                className="flex-1 pr-10 rounded-full bg-muted/50 focus-visible:ring-primary/50"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="absolute right-1 w-8 h-8 rounded-full bg-primary hover:bg-primary/90 transition-transform active:scale-95"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* FLOAT BUTTON (NÚT HÌNH TRÒN GÓC TRÁI/PHẢI) */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-primary/30 transition-all duration-300 z-50 flex items-center justify-center p-0"
        >
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        </Button>
      )}
    </>
  );
}
