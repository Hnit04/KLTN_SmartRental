import { useEffect, useState } from 'react';
import { userApi } from '@/api/userApi';
import type { User } from '@/types';
import { Crown, Mail, Award, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';

const TopLandlordsPage = () => {
  const [landlords, setLandlords] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopLandlords = async () => {
      try {
        const data = await userApi.getTopLandlords(10);
        setLandlords(data);
      } catch (error) {
        console.error("Failed to fetch top landlords", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTopLandlords();
  }, []);

  const top3 = landlords.slice(0, 3);
  const remaining = landlords.slice(3);

  // Reorder top3 for podium: 2nd, 1st, 3rd
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Banner */}
      <div className="bg-primary text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-blue-400 opacity-20 rounded-full blur-3xl"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center justify-center p-3 bg-white/20 rounded-2xl mb-6 backdrop-blur-md border border-white/30 shadow-xl animate-bounce">
            <Award className="h-10 w-10 text-yellow-300" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white">
            Bảng Vàng Chủ Trọ
          </h1>
          <p className="text-lg md:text-xl font-medium text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Nơi vinh danh những đối tác uy tín nhất, mang lại sự an tâm tuyệt đối và trải nghiệm thuê phòng đẳng cấp cho cộng đồng SmartRental.
          </p>
        </div>
      </div>

      <div className="page-shell max-w-5xl -mt-12 relative z-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl shadow-xl border border-gray-100">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mb-4"></div>
            <p className="text-muted-foreground font-medium animate-pulse">Đang tải bảng vinh danh...</p>
          </div>
        ) : landlords.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl p-20 text-center border border-gray-100">
            <Sparkles className="h-16 w-16 text-gray-200 mx-auto mb-6" />
            <p className="text-gray-500 text-lg font-medium">Hệ thống đang cập nhật dữ liệu uy tín...</p>
          </div>
        ) : (
          <>
            {/* Podium for Top 3 */}
            {top3.length > 0 && (
              <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-14 mb-12 border border-gray-100/50">
                <div className="flex items-center justify-center gap-3 mb-14">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-300 hidden sm:block"></div>
                  <h2 className="text-3xl font-black text-center text-gray-800 flex items-center gap-3">
                    <Crown className="h-8 w-8 text-yellow-500 drop-shadow-sm" /> 
                    Top 3 Lan Tỏa Uy Tín
                  </h2>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-300 hidden sm:block"></div>
                </div>
                
                <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-8 pt-8">
                  {podiumOrder.map((user) => {
                    const originalIndex = landlords.findIndex(l => l.id === user.id);
                    const rank = originalIndex + 1;
                    
                    const isFirst = rank === 1;
                    const isSecond = rank === 2;
                    
                    const bgColors = isFirst 
                      ? "bg-gradient-to-t from-yellow-100/60 to-white border-yellow-200" 
                      : isSecond 
                      ? "bg-gradient-to-t from-slate-100 to-white border-slate-200"
                      : "bg-gradient-to-t from-orange-100/60 to-white border-orange-200";

                    const medalColors = isFirst 
                      ? "text-yellow-600 bg-yellow-100 ring-yellow-300" 
                      : isSecond 
                      ? "text-slate-600 bg-slate-100 ring-slate-300"
                      : "text-orange-600 bg-orange-100 ring-orange-300";

                    return (
                      <Link 
                        to={`/landlord/${user.username}/properties`}
                        key={user.id} 
                        className={`group flex flex-col items-center w-full md:w-1/3 transition-all duration-500 hover:-translate-y-4 relative
                          ${isFirst ? 'md:-translate-y-8 z-10' : 'z-0'}
                        `}
                      >
                        {isFirst && (
                          <div className="absolute -top-14 animate-pulse">
                            <Crown className="h-14 w-14 text-yellow-400 drop-shadow-xl" fill="currentColor" />
                          </div>
                        )}
                        
                        <div className="relative mb-6">
                          <div className={`w-28 h-28 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden border-4 bg-white shadow-2xl transition-transform duration-500 group-hover:scale-105
                            ${isFirst ? 'border-yellow-400' : isSecond ? 'border-slate-300' : 'border-orange-400'}
                          `}>
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50 text-4xl font-black text-gray-300">
                                {user.fullName?.charAt(0) || "U"}
                              </div>
                            )}
                          </div>
                          <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ring-4 ring-white shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 ${medalColors}`}>
                            {rank}
                          </div>
                        </div>
                        
                        <div className={`w-full rounded-3xl border p-5 text-center shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:border-primary/30 ${bgColors} ${isFirst ? 'md:pb-14' : 'md:pb-10'}`}>
                          <h3 className="font-bold text-gray-900 text-xl truncate max-w-full px-2 mb-2" title={user.fullName}>
                            {user.fullName}
                          </h3>
                          <div className="flex flex-col items-center gap-3">
                            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-2xl shadow-sm border border-gray-100">
                              <ShieldCheck className="h-5 w-5 text-green-500" />
                              <span className="font-black text-primary text-lg">{user.reputationScore}</span>
                            </div>
                            <Button variant="outline" size="sm" className="w-full rounded-xl border-primary/20 text-primary hover:bg-primary group-hover:bg-primary group-hover:text-white transition-all transform opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300">
                              Xem phòng ngay <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List for Remaining */}
            {remaining.length > 0 && (
              <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-gray-100/50">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                    Top 10 Xuất Sắc Khác
                  </h3>
                  <div className="text-sm font-bold text-primary bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
                    Cập nhật mới nhất
                  </div>
                </div>
                <div className="grid gap-5">
                  {remaining.map((user, idx) => (
                    <Link 
                      to={`/landlord/${user.username}/properties`}
                      key={user.id} 
                      className="group flex items-center gap-6 p-5 rounded-[2rem] border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                    >
                      <div className="w-12 text-center font-black text-gray-300 text-2xl group-hover:text-primary transition-colors">
                        {(idx + 4).toString().padStart(2, '0')}
                      </div>
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-gray-100 shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 font-black text-gray-300">
                            {user.fullName?.charAt(0) || "U"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-lg truncate group-hover:text-primary transition-colors">{user.fullName}</h4>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1.5 text-sm text-gray-500 font-medium">
                          {user.email && (
                            <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-gray-400" /> {user.email}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-4">
                        <div className="flex flex-col items-end">
                          <StatusBadge
                            label={`Uy tín ${user.reputationScore}`}
                            tone="success"
                            className="px-4 py-2 text-base font-black shadow-sm group-hover:bg-green-100/50 transition-colors"
                          />
                        </div>
                        <div className="bg-gray-100 p-2 rounded-full text-gray-400 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TopLandlordsPage;
