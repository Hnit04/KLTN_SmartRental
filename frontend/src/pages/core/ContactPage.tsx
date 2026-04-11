import { useState } from 'react';
import { 
  Mail, 
  MapPin, 
  Phone, 
  Send, 
  Clock, 
  Facebook, 
  Linkedin, 
  Instagram, 
  CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { toast } from 'sonner';

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSent(true);
    toast.success("Tin nhắn của bạn đã được gửi thành công!", {
      description: "Chúng tôi sẽ phản hồi trong vòng 24 giờ tới.",
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* ─── HERO SECTION ─── */}
      <div className="bg-primary/5 py-16 text-center border-b">
        <div className="container px-4">
          <h1 className="text-4xl font-bold text-primary tracking-tight">Liên hệ với chúng tôi</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
            Đội ngũ SmartRental luôn sẵn sàng hỗ trợ bạn. Gửi tin nhắn cho chúng tôi hoặc ghé thăm văn phòng trực tiếp.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12 -mt-8">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* ─── LEFT COLUMN: INFO & MAP (Chiếm 5 phần) ─── */}
          <div className="lg:col-span-5 space-y-8">
            {/* Card Thông tin liên hệ */}
            <div className="bg-card border rounded-2xl shadow-sm p-8 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-6">Thông tin liên hệ</h2>
                <div className="space-y-6">
                  {/* Địa chỉ */}
                  <div className="flex items-start gap-4 group">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Trụ sở chính</h3>
                      <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                        12 Nguyễn Văn Bảo, Phường 4<br />
                        Gò Vấp, Thành phố Hồ Chí Minh
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4 group">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Email hỗ trợ</h3>
                      <a href="mailto:trancongtinh20042004@gmail.com" className="text-muted-foreground text-sm mt-1 block hover:text-primary transition-colors">
                        trancongtinh20042004@gmail.com
                      </a>
                      <a href="mailto:tranngochung19112004@gmail.com" className="text-muted-foreground text-sm mt-1 block hover:text-primary transition-colors">
                        tranngochung19112004@gmail.com
                      </a>
                      <a href="mailto:business@smartrental.vn" className="text-muted-foreground text-sm block hover:text-primary transition-colors">
                        business@smartrental.vn
                      </a>
                    </div>
                  </div>

                  {/* Hotline */}
                  <div className="flex items-start gap-4 group">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Hotline</h3>
                      <a href="tel:1900123456" className="text-muted-foreground text-sm mt-1 block hover:text-primary font-medium">
                        1900 1234
                      </a>
                      <p className="text-xs text-muted-foreground">(Cước phí: 1.000đ/phút)</p>
                    </div>
                  </div>

                  {/* Giờ làm việc */}
                  <div className="flex items-start gap-4 group">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Giờ làm việc</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Thứ 2 - Thứ 6: 8:00 - 18:00<br />
                        Thứ 7: 8:00 - 12:00
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-foreground mb-4">Kết nối với chúng tôi</h3>
                <div className="flex gap-4">
                  <button className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                    <Facebook className="h-5 w-5" />
                  </button>
                  <button className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-blue-700 hover:text-white transition-all">
                    <Linkedin className="h-5 w-5" />
                  </button>
                  <button className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all">
                    <Instagram className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Google Map Embed (Địa chỉ thực tế 12 Nguyễn Văn Bảo) */}
            <div className="rounded-2xl overflow-hidden border shadow-sm h-64 bg-muted">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.858169091027!2d106.68427047465943!3d10.822164158350036!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317528e549695d13%3A0x333f98c86432617c!2zMTIgTmd1eX 4VuIFbEg24gQuG6o28sIFBoxrDhu51uZyA0LCBHw7IgVuG6pXAsIEjhu5MgQ2jDrSBNaW5oLCBWaWV0bmFt!5e0!3m2!1sen!2s!4v1710000000000!5m2!1sen!2s" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Map"
              ></iframe>
            </div>
          </div>

          {/* ─── RIGHT COLUMN: CONTACT FORM (Chiếm 7 phần) ─── */}
          <div className="lg:col-span-7">
            <div className="bg-card border p-8 md:p-10 rounded-2xl shadow-lg h-full relative overflow-hidden">
              
              {isSent ? (
                /* Trạng thái sau khi gửi thành công */
                <div className="h-full flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in duration-300">
                  <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Tin nhắn đã được gửi!</h2>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    Cảm ơn bạn đã liên hệ. Chúng tôi đã nhận được thông tin và sẽ phản hồi qua email <b>trancongtinh20042004@gmail.com</b> sớm nhất có thể.
                  </p>
                  <Button 
                    className="mt-8" 
                    variant="outline"
                    onClick={() => setIsSent(false)}
                  >
                    Gửi tin nhắn khác
                  </Button>
                </div>
              ) : (
                /* Form nhập liệu */
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Gửi tin nhắn trực tuyến</h2>
                    <p className="text-muted-foreground">
                      Điền vào biểu mẫu bên dưới, chúng tôi sẽ phản hồi trong vòng 24h.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Họ và tên <span className="text-red-500">*</span></Label>
                        <Input id="name" placeholder="Ví dụ: Nguyễn Văn A" required className="h-11 bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">Số điện thoại <span className="text-red-500">*</span></Label>
                        <Input id="phone" placeholder="Ví dụ: 0909 123 456" required className="h-11 bg-background" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email liên hệ <span className="text-red-500">*</span></Label>
                      <Input id="email" type="email" placeholder="email@example.com" required className="h-11 bg-background" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium">Vấn đề cần hỗ trợ</Label>
                      <select 
                        id="subject"
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="general">📧 Hỗ trợ chung</option>
                        <option value="account">👤 Vấn đề tài khoản / Đăng nhập</option>
                        <option value="billing">💳 Thanh toán & Hợp đồng</option>
                        <option value="technical">🐛 Lỗi kỹ thuật</option>
                        <option value="partnership">🤝 Hợp tác kinh doanh</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-sm font-medium">Nội dung chi tiết <span className="text-red-500">*</span></Label>
                      <textarea 
                        id="message"
                        required
                        className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y" 
                        placeholder="Vui lòng mô tả chi tiết vấn đề bạn đang gặp phải..."
                      />
                    </div>

                    <Button type="submit" className="w-full h-11 text-base gap-2" isLoading={isLoading}>
                      {isLoading ? "Đang gửi..." : (
                        <>
                          <Send className="h-4 w-4" /> Gửi tin nhắn
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground pt-4">
                      Bằng việc gửi tin nhắn, bạn đồng ý với <a href="/privacy" className="underline hover:text-primary">Chính sách bảo mật</a> của chúng tôi.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}