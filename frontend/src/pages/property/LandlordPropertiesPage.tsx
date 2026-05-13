import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { propertyApi } from "@/api/propertyApi";
import { userApi } from "@/api/userApi";
import type { Property, User } from "@/types/index";
import PropertyCard from "@/features/property/components/PropertyCard";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ShieldCheck, Mail, Phone, Building2, Star } from "lucide-react";

export default function LandlordPropertiesPage() {
  const { username } = useParams<{ username: string }>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [landlord, setLandlord] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      try {
        setIsLoading(true);
        // Lấy thông tin user và danh sách phòng cùng lúc
        const [userRes, propsRes] = await Promise.all([
          userApi.findByUsername(username),
          propertyApi.getPropertiesByLandlordUsername(username),
        ]);
        
        setLandlord(userRes);
        setProperties(propsRes.data);
      } catch (error) {
        console.error("Failed to fetch landlord data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [username]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* --- HERO / LANDLORD INFO --- */}
      <div className="bg-white border-b pt-24 pb-12">
        <div className="page-shell">
          <Link to="/top-landlords" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Quay lại Bảng Xếp Hạng
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-gray-100">
                {landlord?.avatarUrl ? (
                  <img src={landlord.avatarUrl} alt={landlord.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300">
                    {landlord?.fullName?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-xl shadow-lg ring-4 ring-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-gray-900">{landlord?.fullName}</h1>
                  {landlord?.reputationScore && landlord.reputationScore >= 90 && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold ring-1 ring-primary/20">
                      <Star className="h-3 w-3 fill-primary" /> Chủ trọ uy tín
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" /> Điểm uy tín: 
                  <span className="font-bold text-primary">{landlord?.reputationScore || 0} / 100</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" /> {landlord?.email || "Chưa cập nhật"}
                </div>
                {landlord?.phoneNumber && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" /> {landlord.phoneNumber}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="h-4 w-4 text-gray-400" /> {properties.length} Khu trọ đang quản lý
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="shrink-0 w-full md:w-auto">
              {(landlord?.phoneNumber || landlord?.zaloPhone) ? (
                <Button 
                  onClick={() => window.open(`https://zalo.me/${landlord?.zaloPhone || landlord?.phoneNumber}`, '_blank')} 
                  className="w-full md:w-auto gap-2 h-12 px-8 rounded-2xl shadow-lg shadow-primary/20"
                >
                  Liên hệ qua Zalo
                </Button>
              ) : (
                <Button disabled className="w-full md:w-auto gap-2 h-12 px-8 rounded-2xl opacity-50">
                  Chưa có Zalo
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="page-shell py-12">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Danh Sách Khu Trọ</h2>
          <div className="text-sm text-muted-foreground">
            Hiển thị {properties.length} khu trọ
          </div>
        </div>

        {properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {properties.map((property) => (
              <PropertyCard key={property.id} data={property} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-gray-200">
            <div className="bg-muted/40 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa có bài đăng nào</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Chủ trọ này hiện chưa có bài đăng khu trọ công khai nào trên hệ thống.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
