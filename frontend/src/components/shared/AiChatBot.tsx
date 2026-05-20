import { useState, useRef, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Bot, User, Loader2, Home, ExternalLink, MapPin, Sparkles, ChevronRight, ShieldCheck, Clock3 } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { aiApi, type QueryDataLocationPayload } from "../../api/aiApi";
import { useAuth } from "../../context/AuthContext";
import { cn } from "@/utils/cn";
import { useMobileLayer } from "@/context/MobileLayerContext";
import { toast } from "sonner";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  isDataQuery?: boolean;
  hasReminderAction?: boolean;
  reminderScope?: "OVERDUE" | "DUE_SOON";
  sourceLabel?: string;
  queryAt?: string;
  roomCardCount?: number;
  missingDistanceCount?: number;
  locationReferenceType?: "user" | "landmark" | "none";
  roomActionEligible?: boolean;
};

type LocationFetchResult = {
  location: QueryDataLocationPayload | null;
  errorCode?: number;
  errorMessage?: string;
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

  // States: Phục vụ AI Bulk Reminder
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftedReminders, setDraftedReminders] = useState<any[]>([]);
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderScopeMode, setReminderScopeMode] = useState<"OVERDUE" | "DUE_SOON">("OVERDUE");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const { registerLayer, unregisterLayer, getBottomOffset, getZIndex } = useMobileLayer();
  const { isAuthenticated, user } = useAuth();

  const isAppShell =
    /^\/(landlord|tenant|admin)(\/|$)/.test(pathname) || pathname.startsWith("/profile");
  const aiChatBottomOffset = getBottomOffset("aiChat");
  const mobileDockStyle = {
    "--mobile-chat-bottom": `${(isAppShell ? aiChatBottomOffset : 0) + 12}px`,
  } as CSSProperties;

  useEffect(() => {
    registerLayer("aiChat", {
      active: !isOpen,
      height: 56,
      zIndex: 55,
      priority: 70,
    });
    return () => unregisterLayer("aiChat");
  }, [isOpen, registerLayer, unregisterLayer]);

  const isLandlord = user?.role === 'LANDLORD';
  const isTenant = user?.role === 'TENANT';

  // --- NÚT GỢI Ý (QUICK PROMPTS) DỰA THEO ROLE ---
  const landlordPrompts = [
    "📊 Doanh thu tháng này là bao nhiêu?",
    "⚠️ Liệt kê các phòng chưa đóng tiền",
    "🔍 Phân tích điện nước bất thường",
    "🏠 Tôi còn bao nhiêu phòng trống?"
  ];

  const tenantPrompts = [
    "📝 Kiểm tra hạn hợp đồng phòng của tôi",
    "💰 Tháng này tôi phải đóng bao nhiêu tiền?",
    "⚡ Tra cứu số điện nước tháng trước",
  ];

  const defaultPrompts = [
    "🏠 Tìm phòng trọ giá rẻ cho sinh viên",
    "📍 Có phòng nào gần đại học Bách Khoa không?",
    "🤔 Lời khuyên khi đi thuê trọ lần đầu"
  ];

  const currentPrompts = isLandlord ? landlordPrompts : (isTenant ? tenantPrompts : defaultPrompts);
  const showPrompts = messages.length === 1 && !isLoading; // Chỉ hiện khi mới chào

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

  const parseRoomCardPrice = (rawPrice: string): number => {
    const cleaned = rawPrice
      .trim()
      .toLowerCase()
      .replace(/(vnđ|vnd|đ)/g, "")
      .replace(/\s+/g, "");

    const unitMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*(tr|triệu|trieu|k)$/i);
    if (unitMatch) {
      const baseValue = Number(unitMatch[1].replace(",", "."));
      const unit = unitMatch[2].toLowerCase();
      if (Number.isFinite(baseValue)) {
        if (unit === "k") return Math.round(baseValue * 1_000);
        return Math.round(baseValue * 1_000_000);
      }
    }

    if (/^\d+(\.\d+)?$/.test(cleaned)) {
      return Math.round(Number(cleaned));
    }
    if (/^\d+(,\d+)?$/.test(cleaned)) {
      return Math.round(Number(cleaned.replace(",", ".")));
    }

    const digits = cleaned.replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
  };

  const formatVnd = (value: number): string =>
    value > 0 ? `${value.toLocaleString("vi-VN")}đ` : "Liên hệ";

  const getRoomCardCount = (text: string): number => {
    const matches = text.match(/\[ROOM_CARD:/g);
    return matches ? matches.length : 0;
  };

  const getMissingDistanceCount = (text: string): number => {
    const regex = /\[ROOM_CARD:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|\]]*?)(?:\s*\|\s*([^\]]*))?\]/g;
    let missing = 0;
    let match: RegExpExecArray | null = null;

    while ((match = regex.exec(text)) !== null) {
      const distance = match[5]?.trim();
      if (!distance) {
        missing += 1;
      }
    }

    return missing;
  };

  const formatQueryTime = (isoTime?: string): string => {
    if (!isoTime) return "";
    const parsed = new Date(isoTime);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
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
      const cleanPrice = parseRoomCardPrice(priceStr);
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
                {formatVnd(cleanPrice)}
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
            <div className="mb-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Dữ liệu giá từ hệ thống SmartRental
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-2">
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
                   window.location.href = `/rooms/${roomId.trim()}?action=book`;
                }}
              >
                Đặt lịch xem
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
  const getCurrentQueryLocation = async (): Promise<LocationFetchResult> => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return { location: null, errorMessage: "geolocation-unavailable" };
    }

    const getPosition = (options: PositionOptions) =>
      new Promise<LocationFetchResult>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              },
            });
          },
          (error) => {
            console.warn("[GEO] getCurrentPosition failed:", error.code, error.message);
            resolve({
              location: null,
              errorCode: error.code,
              errorMessage: error.message,
            });
          },
          options
        );
      });

    const highAccuracy = await getPosition({
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 0,
    });
    if (highAccuracy.location) {
      return highAccuracy;
    }

    const fallback = await getPosition({
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 0,
    });
    if (fallback.location) {
      return fallback;
    }
    return fallback.errorCode ? fallback : highAccuracy;
  };

  const isCurrentLocationQuery = (normalizedMsgNoAccent: string): boolean => {
    const cues = [
      "gan day",
      "gan toi",
      "quanh day",
      "quanh toi",
      "xung quanh toi",
      "xung quanh day",
      "o gan toi",
      "gan vi tri hien tai",
      "vi tri cua toi",
      "vi tri hien tai",
      "near me",
      "around me",
      "nearby",
    ];
    return cues.some((keyword) => normalizedMsgNoAccent.includes(keyword));
  };

  const buildLocationErrorMessage = (errorCode?: number): string => {
    if (errorCode === 1) {
      return "Chua nhan duoc GPS tu trinh duyet: ban dang chan quyen vi tri. Vui long cho phep Location cho tab nay roi thu lai.";
    }
    if (errorCode === 2) {
      return "Chua nhan duoc GPS tu trinh duyet: thiet bi/trinh duyet chua lay duoc vi tri hien tai. Vui long thu lai sau.";
    }
    if (errorCode === 3) {
      return "Chua nhan duoc GPS tu trinh duyet: da qua thoi gian lay vi tri. Vui long thu lai va kiem tra mang.";
    }
    return "Chua nhan duoc GPS tu trinh duyet. Vui long bat quyen vi tri cho tab nay va thu lai.";
  };

  const detectReminderScope = (normalizedMsgNoAccent: string): "OVERDUE" | "DUE_SOON" | null => {
    const text = ` ${normalizedMsgNoAccent.replace(/\s+/g, " ").trim()} `;
    const overdueCues = [" no tien ", " dang no ", " chua dong ", " tre han ", " qua han "];
    if (overdueCues.some((cue) => text.includes(cue))) {
      return "OVERDUE";
    }

    const dueSoonCues = [
      " nhac hen hoa don ",
      " nhac han hoa don ",
      " sap den han ",
      " den han thanh toan ",
      " han thanh toan ",
      " nhac thanh toan ",
    ];
    if (dueSoonCues.some((cue) => text.includes(cue))) {
      return "DUE_SOON";
    }
    return null;
  };

  // --- ACTIONS CHO TÍNH NĂNG NHẮC NỢ ---
  const handleGenerateReminders = async (scope: "OVERDUE" | "DUE_SOON" = "OVERDUE") => {
    setReminderScopeMode(scope);
    setIsGeneratingDrafts(true);
    try {
      const res = await aiApi.generateReminders(scope, 3);
      if (res.data && res.data.length > 0) {
        setDraftedReminders(res.data);
        setIsDraftModalOpen(true);
      } else {
        toast.info(
          res.message ||
          (scope === "DUE_SOON"
            ? "Khong co hoa don sap den han de nhac."
            : "Khong co phong nao dang no de nhac.")
        );
      }
    } catch (e: any) {
      toast.error("Lỗi khi nhờ AI soạn thông báo: " + (e.message || "Thử lại sau."));
    } finally {
      setIsGeneratingDrafts(false);
    }
  };

  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    try {
      const res = await aiApi.sendReminders(draftedReminders);
      toast.success(res.message || "Gửi thành công!");
      setIsDraftModalOpen(false);
      
      // AI phản hồi vào chat
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: `✅ Em đã hoàn thành nhiệm vụ! Đã tự động gửi nhắc nhở thanh toán đến ${draftedReminders.length} chủ phòng qua trung tâm Thông Báo.`,
        sender: "ai"
      }]);
    } catch (e: any) {
      toast.error("Lỗi khi gửi thông báo: " + (e.message || ""));
    } finally {
      setIsSendingReminders(false);
    }
  };

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

    // Chuẩn hoá tin nhắn (NFC) để khớp chính xác các biến thể dấu tiếng Việt
    const normalizedMsg = fullMsg.normalize('NFC').toLowerCase();
    
    const isAnomalyQuery = isLandlord && (normalizedMsg.includes("phân tích điện nước bất thường") || normalizedMsg.includes("điện nước bất thường") || normalizedMsg.includes("chênh lệch"));
    const isGeneralAnalysis = !isAnomalyQuery && (normalizedMsg.includes("phân tích") || normalizedMsg.includes("tư vấn") || normalizedMsg.includes("ưu điểm") || normalizedMsg.includes("nhược điểm") || normalizedMsg.includes("lời khuyên"));
    
    // Kiểm tra xem câu hỏi có mang tính truy vấn dữ liệu không (hỏi giá, hỏi nợ, hoá đơn)
    const dataKeywords = [
        "hoá đơn", "hóa đơn", "hoa don", "bill", "tiền", "tien", "nợ", "no",
        "phòng", "phong", "hợp đồng", "hop dong", "contract",
        "gần", "gan", "khu vực", "khu vuc", "quanh", "nearby", "landmark",
        "lịch hẹn", "lich hen", "appointment",
        "doanh thu", "revenue", "thanh toán", "thanh toan", "trễ", "tre", "quá hạn", "qua han", "phí", "phi",
        "điện", "dien", "nước", "nuoc", "chỉ số", "chi so", "tra cứu", "tra cuu", "số điện", "so dien", "số nước", "so nuoc",
        "khu trọ", "khu tro", "còn trống", "con trong", "phòng trống", "phong trong", "tìm phòng", "tim phong",
        "hết hạn", "het han", "gia hạn", "gia han", "tiền cọc", "tien coc", "deposit"
    ];
    
    const policyKeywords = [
      "la gi",
      "là gì",
      "nhu the nao",
      "như thế nào",
      "ra sao",
      "quy dinh",
      "quy định",
      "chinh sach",
      "chính sách"
    ];
    const hasPolicyStyle = policyKeywords.some((keyword) =>
      normalizedMsg.includes(keyword.normalize("NFC").toLowerCase())
    );
    const personalDataMarkers = [
      "cua toi",
      "của tôi",
      "toi con",
      "tôi còn",
      "hien tai",
      "hiện tại",
      "thang nay",
      "tháng này",
      "thang ",
      "tháng "
    ];
    const hasPersonalDataMarker = personalDataMarkers.some((marker) =>
      normalizedMsg.includes(marker.normalize("NFC").toLowerCase())
    );

    const isDataQuery = (!isGeneralAnalysis && !isAnomalyQuery) &&
        dataKeywords.some(keyword => normalizedMsg.includes(keyword.normalize('NFC').toLowerCase())) &&
        !(hasPolicyStyle && !hasPersonalDataMarker);
    const normalizedMsgNoAccent = normalizedMsg
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u0111/g, "d")
      .replace(/\u0110/g, "D");

    const isUserLocationQuery = isCurrentLocationQuery(normalizedMsgNoAccent);
    const reminderScopeCandidate = detectReminderScope(normalizedMsgNoAccent);
    const isLandmarkLocationQuery =
      !isUserLocationQuery &&
      (normalizedMsgNoAccent.includes("gan") ||
        normalizedMsgNoAccent.includes("quanh") ||
        normalizedMsgNoAccent.includes("landmark"));

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
      let sourceLabel: string | undefined;

      if (isAnomalyQuery) {
         try {
             const anomaliesRes = await aiApi.analyzeAnomalies();
             replyText = anomaliesRes.report;
         } catch(error: any) {
             replyText = error.response?.data?.message || "Xin lỗi, không phân tích được dữ liệu lúc này.";
         }
      } else if (isDataQuery) {
        // Gửi truy vấn dữ liệu cho cả GUEST và User. 
        // Backend sẽ tự động chặn các bảng nhạy cảm (bills, contracts) cho GUEST.
        try {
          let queryLocation: QueryDataLocationPayload | null = null;
          let skipBackendQuery = false;
          if (isUserLocationQuery) {
            const geoResult = await getCurrentQueryLocation();
            queryLocation = geoResult.location;
            if (!queryLocation) {
              skipBackendQuery = true;
              replyText = buildLocationErrorMessage(geoResult.errorCode);
              sourceLabel = "Chua nhan duoc GPS tu trinh duyet";
            }
          }
          if (!skipBackendQuery) {
            const dataRes = await aiApi.queryData(userMsg, queryLocation);
            replyText = dataRes.data;
            sourceLabel = dataRes.verifiable
              ? "Đã đối soát từ dữ liệu hệ thống"
              : "Nguồn dữ liệu cần kiểm tra thêm";
          }
        } catch (error: any) {
          replyText = error.response?.data?.message || "Xin lỗi, hệ thống truy xuất dữ liệu đang bận.";
          sourceLabel = "Không thể đối soát do lỗi truy vấn";
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
      const roomCardCount = getRoomCardCount(replyText);
      const missingDistanceCount = getMissingDistanceCount(replyText);
      const locationReferenceType: Message["locationReferenceType"] = isUserLocationQuery
        ? "user"
        : isLandmarkLocationQuery
          ? "landmark"
          : "none";
      const roomActionEligible =
        isDataQuery &&
        (isUserLocationQuery ||
          isLandmarkLocationQuery ||
          normalizedMsg.includes("tim phong") ||
          normalizedMsg.includes("tìm phòng") ||
          normalizedMsg.includes("phong trong") ||
          normalizedMsg.includes("phòng trống"));

      setMessages((prev) => [
        ...prev,
        { 
          id: (Date.now() + 1).toString(), 
          text: replyText, 
          sender: "ai",
          isDataQuery,
          sourceLabel,
          queryAt: isDataQuery ? new Date().toISOString() : undefined,
          roomCardCount,
          missingDistanceCount,
          locationReferenceType,
          roomActionEligible,
          hasReminderAction: isLandlord && isDataQuery && reminderScopeCandidate !== null,
          reminderScope: reminderScopeCandidate ?? undefined
        },
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
        <div
          className={cn(
            "fixed z-[60] flex min-h-0 max-h-[min(88dvh,calc(100dvh-1rem))] w-auto flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl animate-in slide-in-from-bottom-5 zoom-in-95 duration-300 max-md:inset-x-3 max-md:bottom-[var(--mobile-chat-bottom)] max-md:w-auto md:bottom-6 md:right-6 md:h-[min(560px,85dvh)] md:w-96"
          )}
          style={{ ...mobileDockStyle, zIndex: getZIndex("aiChat") + 5 }}
        >
          {/* HEADER */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <div>
                <h3 className="font-semibold text-base">SmartRental Copilot</h3>
                <p className="text-xs text-primary-foreground/80">Trợ lý Vận hành & Phân tích</p>
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
                className={`px-5 py-4 min-h-[44px] text-[14.5px] leading-relaxed relative ${msg.sender === "user" ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm shadow-md' : 'bg-white border border-border shadow-sm rounded-2xl rounded-tl-sm text-foreground'}`}
              >
                  {msg.sender === "ai" && msg.isDataQuery && (
                    <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {msg.sourceLabel || "Đã đối soát từ dữ liệu hệ thống"}
                        </div>
                        {msg.queryAt && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-emerald-700/80">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatQueryTime(msg.queryAt)}
                          </div>
                        )}
                      </div>
                      {typeof msg.roomCardCount === "number" && msg.roomCardCount > 0 && (
                        <div className="mt-1 text-[11px] text-emerald-800/90">
                          Tìm thấy {msg.roomCardCount} kết quả phù hợp.
                        </div>
                      )}
                      {typeof msg.missingDistanceCount === "number" && msg.missingDistanceCount > 0 && msg.locationReferenceType !== "none" && (
                        <div className="mt-1 text-[11px] text-emerald-700/90">
                          {msg.locationReferenceType === "user"
                            ? (msg.roomCardCount === msg.missingDistanceCount
                              ? "Chưa lấy được khoảng cách từ vị trí hiện tại của bạn."
                              : `Còn ${msg.missingDistanceCount} kết quả chưa có khoảng cách từ vị trí của bạn.`)
                            : (msg.roomCardCount === msg.missingDistanceCount
                              ? "Chưa tính được khoảng cách từ địa điểm bạn nhập. Đang hiển thị kết quả theo điều kiện còn lại."
                              : `Khoảng cách được tính theo địa điểm bạn nhập; còn ${msg.missingDistanceCount} kết quả chưa có dữ liệu khoảng cách.`)}
                        </div>
                      )}
                      {msg.roomActionEligible && typeof msg.roomCardCount === "number" && msg.roomCardCount > 0 && msg.roomCardCount <= 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-8 border-emerald-300 bg-white text-[11px] text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                          onClick={() => {
                            setIsOpen(false);
                            window.location.href = "/properties";
                          }}
                        >
                          Xem thêm phòng phù hợp
                        </Button>
                      )}
                    </div>
                  )}
                  {msg.sender === "ai" ? renderMessageWithCards(msg.text) : msg.text}
                  {msg.hasReminderAction && (
                    <div className="mt-4 pt-3 border-t border-border/50 animate-in fade-in duration-500">
                      <Button 
                         variant="default"
                         onClick={() => handleGenerateReminders(msg.reminderScope || "OVERDUE")}
                         disabled={isGeneratingDrafts}
                         className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md rounded-xl transition-all h-10"
                      >
                         {isGeneratingDrafts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-300" />}
                         {isGeneratingDrafts
                           ? "AI đang soạn tin nhắn..."
                           : (msg.reminderScope === "DUE_SOON"
                             ? "Nhờ AI soạn thông báo nhắc đến hạn"
                             : "Nhờ AI soạn thông báo nhắc nợ")}
                      </Button>
                    </div>
                  )}
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
            
            {/* HIỂN THỊ QUICK PROMPTS NẾU LÀ TIN NHẮN MỚI */}
            {showPrompts && (
              <div className="mt-6 flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Gợi ý hành động nhanh
                </p>
                <div className="flex flex-col gap-2 w-full max-w-[90%]">
                  {currentPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(p)}
                      className="text-left w-full bg-background border border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-[13px] text-foreground/80 font-medium px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 flex justify-between items-center group"
                    >
                      <span>{p}</span>
                      <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                    </button>
                  ))}
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

      {/* NÚT MỞ BÓNG BÓNG CHAT */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "group fixed z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-primary p-0 shadow-2xl transition-transform duration-300 hover:scale-110 hover:bg-primary/90 max-md:bottom-[var(--mobile-chat-bottom)] max-md:right-3 md:bottom-6 md:right-6"
          )}
          style={{ ...mobileDockStyle, zIndex: getZIndex("aiChat") }}
        >
          <Sparkles className="w-6 h-6 text-yellow-300 absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Bot className="w-7 h-7 text-primary-foreground" />
        </Button>
      )}

      {/* TÍNH NĂNG ACTIONABLE AI: MODAL DUYỆT TIN NHẮN */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                <h3 className="font-bold text-lg">
                  {reminderScopeMode === "DUE_SOON" ? "AI Nhắc Hạn Thanh Toán" : "AI Nhắc Nợ Hàng Loạt"}
                </h3>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setIsDraftModalOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              <p className="text-sm text-muted-foreground mb-4">
                {reminderScopeMode === "DUE_SOON"
                  ? <>AI đã soạn nội dung nhắc đến hạn cho <strong className="text-primary">{draftedReminders.length}</strong> phòng. Bạn kiểm tra lại trước khi gửi.</>
                  : <>AI đã soạn nội dung gửi đến <strong className="text-primary">{draftedReminders.length}</strong> phòng đang nợ tiền. Bạn kiểm tra lại trước khi gửi.</>}
              </p>
              
              {draftedReminders.map((draft, idx) => (
                <div key={idx} className="bg-background border border-border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-primary flex items-center gap-1.5 border-b border-primary/20 pb-1">
                      <Home className="w-3.5 h-3.5" />Phòng {draft.roomName}
                    </span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-sm">ID Hóa Đơn: #{draft.billId}</span>
                  </div>
                  <textarea 
                    className="w-full text-[13px] text-foreground/90 bg-muted/10 border border-border rounded-md p-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                    value={draft.draftedMessage}
                    onChange={(e) => {
                      const newDrafts = [...draftedReminders];
                      newDrafts[idx].draftedMessage = e.target.value;
                      setDraftedReminders(newDrafts);
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border bg-background flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDraftModalOpen(false)}>Nhờ sau</Button>
              <Button 
                 className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-2"
                 onClick={handleSendReminders}
                 disabled={isSendingReminders}
              >
                {isSendingReminders ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Xác nhận Gửi hàng loạt
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
