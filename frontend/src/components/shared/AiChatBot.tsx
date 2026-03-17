import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Home, DollarSign, ExternalLink } from "lucide-react";
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

  // --- HÀM RENDER TIN NHẮN CHỨA CARD UI ---
  const renderMessageWithCards = (text: string): ReactNode => {
    // Regex tìm chuỗi [ROOM_CARD: id | name | price]
    const regex = /\[ROOM_CARD:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // 1. Đưa phần text bình thường trước cái match vào (nếu có)
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // 2. Parse thông tin từ match
      const [_, roomId, roomName, priceStr] = match;
      
      // 3. Render Card Giao diện
      parts.push(
        <div key={match.index} className="w-full bg-background border border-border/60 rounded-xl shadow-sm mt-3 mb-2 overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-3 bg-primary/10 flex items-center justify-between border-b border-border/40">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Home className="w-4 h-4" />
              <span>{roomName.trim()}</span>
            </div>
          </div>
          <div className="p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-muted-foreground">Giá thuê:</span>
              <span className="font-bold text-destructive flex items-center gap-1">
                {priceStr.trim()} <DollarSign className="w-3 h-3" />
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full flex items-center gap-2 text-xs h-8 mt-2"
              onClick={() => window.open(`/rooms/${roomId.trim()}`, '_blank')}
            >
              <ExternalLink className="w-3 h-3" /> Xem chi tiết phòng
            </Button>
          </div>
        </div>
      );

      lastIndex = regex.lastIndex;
    }

    // 4. Còn thừa text nào phía sau cuối cùng thì push nốt vào
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // Trả về mảng các element (text và component đan xen)
    return parts.length > 0 ? parts : text;
  };

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");
    
    // Kiểm tra xem câu hỏi có mang tính truy vấn dữ liệu không (hỏi giá, hỏi nợ, hoá đơn)
    const isDataQuery = 
        userMsg.toLowerCase().includes("hoá đơn") || 
        userMsg.toLowerCase().includes("hóa đơn") ||
        userMsg.toLowerCase().includes("tiền") ||
        userMsg.toLowerCase().includes("nợ") ||
        userMsg.toLowerCase().includes("phòng") ||
        userMsg.toLowerCase().includes("hợp đồng");

    // Thêm tin nhắn của User vào UI
    const newMessage: Message = {
      id: Date.now().toString(),
      text: userMsg,
      sender: "user",
      isDataQuery
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

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
        // Chat thông thường (hỏi linh tinh, hỏi luật)
        const chatRes = await aiApi.chat(userMsg, "web-session");
        replyText = chatRes.reply;
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
