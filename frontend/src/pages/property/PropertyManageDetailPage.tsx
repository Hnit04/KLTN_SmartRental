import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  Plus, Edit, ArrowLeft, Loader2,
  Sparkles, X, FileText, FileSignature, CheckSquare, ScrollText,
  AlertTriangle, Layers, Copy, ShieldCheck, ShieldAlert, Users,
  Wrench, CheckCircle, ChevronRight, ChevronLeft, Building, Lock, Clock
} from 'lucide-react';
import type { RoomType } from '@/types/index';
import { propertyApi } from '@/api/propertyApi';
import { roomApi } from '@/api/roomApi';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import type { Property, Room } from '@/types/index';
import UpgradePromptModal from '@/components/subscription/UpgradePromptModal';
import { vipApi } from '@/api/vipApi';
import { StatusSummaryStrip, AttentionBanner } from '@/components/detail';
import type { SummaryStripItem } from '@/components/detail';
import { formatDate } from '@/utils/format';
import { useAutoSaveForm } from '@/hooks/useAutoSaveForm';
import FormBlocker from '@/components/shared/FormBlocker';
import { useAuth } from '@/context/AuthContext';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import UploadQueueUI from '@/components/shared/UploadQueueUI';

// Danh sách các tiện ích phổ biến
const COMMON_AMENITIES = [
  "Máy lạnh", "Tủ lạnh", "Máy giặt", "Nóng lạnh",
  "Giường nệm", "Tủ quần áo", "Ban công", "Kệ bếp",
  "Chỗ để xe", "Thang máy", "Wifi tốc độ cao", "An ninh 24/7",
  "Máy hút mùi", "Sofa", "Smart TV", "Bàn ghế làm việc"
];

// Mapping loại phòng
const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  STUDIO: 'Phòng trọ Studio',
  ONE_BEDROOM: '1 Phòng ngủ',
  TWO_BEDROOM: '2 Phòng ngủ',
  SINGLE_ROOM: 'Phòng đơn',
  SHARED_ROOM: 'Phòng ghép / Ở chung',
  MEZZANINE_ROOM: 'Phòng có gác lửng',
};

// ✅ DANH SÁCH GỢI Ý ĐIỀU KHOẢN DÀNH CHO CHỦ TRỌ
const RULE_CATEGORIES: { label: string; color: string; rules: { text: string; toggle?: string }[] }[] = [
  {
    label: '🐾 Thú cưng',
    color: 'amber',
    rules: [
      { text: 'Cho nuôi thú cưng (chó, mèo).', toggle: 'Không cho nuôi thú cưng (chó, mèo).' },
    ],
  },
  {
    label: '🔇 Sinh hoạt',
    color: 'blue',
    rules: [
      { text: 'Giữ yên tĩnh chung sau 22h00 đêm.' },
      { text: 'Không hút thuốc trong phòng.' },
      { text: 'Giữ gìn vệ sinh khu vực chung.' },
      { text: 'Không mang người lạ về ở qua đêm.' },
    ],
  },
  {
    label: '💰 Tài chính',
    color: 'emerald',
    rules: [
      { text: 'Chậm tiền nhà quá 5 ngày phạt 5%.' },
      { text: 'Thanh toán tiền nhà trước ngày 5 hàng tháng.' },
    ],
  },
  {
    label: '📋 Hợp đồng',
    color: 'violet',
    rules: [
      { text: 'Báo trước 30 ngày trước khi trả phòng.' },
      { text: 'Không được sang nhượng phòng cho người khác.' },
    ],
  },
  {
    label: '🔧 Tài sản',
    color: 'rose',
    rules: [
      { text: 'Bồi thường 100% nếu làm hỏng tài sản phòng.' },
      { text: 'Không tự ý sửa chữa, khoan tường.' },
    ],
  },
];

export default function PropertyManageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // --- STATE CHO MODAL PHÒNG ---
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTone, setAiTone] = useState<'SEO' | 'GENZ' | 'PRO'>('SEO');
  const [aiContentPreview, setAiContentPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [roomStep, setRoomStep] = useState(1);

  // --- STATE XÓA PHÒNG ---
  const [deleteRoomConfirm, setDeleteRoomConfirm] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- STATE BẢO TRÌ PHÒNG ---
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);
  const [maintenanceRoomId, setMaintenanceRoomId] = useState<number | string | null>(null);

  // --- MODAL XÁC NHẬN BẢO TRÌ ---
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [pendingMaintenanceAction, setPendingMaintenanceAction] = useState<{
    roomId: number | string;
    roomName: string;
    type: 'start' | 'complete';
  } | null>(null);

  // --- MODAL CẢNH BÁO KHÔNG ĐƯỢC BẢO TRÌ ---
  const [showCannotMaintenanceModal, setShowCannotMaintenanceModal] = useState(false);
  const [cannotMaintenanceRoom, setCannotMaintenanceRoom] = useState<{name: string; status: string} | null>(null);

  // --- STATE CHO VIP LIMIT ---
  const [vipLimit, setVipLimit] = useState<{
    isOpen: boolean; limitType: string; currentTier: string; currentCount: number; maxAllowed: number; message: string;
  }>({ isOpen: false, limitType: '', currentTier: '', currentCount: 0, maxAllowed: 0, message: '' });

  const INITIAL_ROOM_DATA = {
    name: '', 
    price: '', 
    area: '', 
    description: '',
    type: 'STUDIO' as RoomType,
    hasMezzanine: false,
    hasBalcony: false,
    maxOccupants: '',
    amenities: [] as string[], 
    customAmenitiesInput: '', 
    images: [] as string[],
    panoramaImages: [] as string[],
    defaultTerms: '',
    version: undefined as number | undefined
  };

  const { formData, setFormData, clearDraft, isDirty } = useAutoSaveForm(
    `draft_room_form_${id}${editingId ? `_edit_${editingId}` : ''}`, 
    INITIAL_ROOM_DATA,
    showModal
  );

  // --- UPLOAD QUEUE (ảnh thường: có nén, ảnh 360: không nén) ---
  const imageQueue = useUploadQueue({ compress: true });
  const panoQueue = useUploadQueue({ compress: false });

  // Sync success URLs vào formData để AutoSave lưu lại URL ảnh đã tải lên
  useEffect(() => {
    setFormData(prev => ({ ...prev, images: imageQueue.successUrls }));
  }, [imageQueue.successUrls, setFormData]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, panoramaImages: panoQueue.successUrls }));
  }, [panoQueue.successUrls, setFormData]);

  // --- STATE CHO EXCEL IMPORT ---
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [excelRooms, setExcelRooms] = useState<Record<string, any>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importErrors, setImportErrors] = useState<{name: string, reason: string}[]>([]);

  // --- STATE AI GỢI Ý GIÁ ---
  const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<{suggestion: string, reason: string} | null>(null);
  const [appliedSuggestion, setAppliedSuggestion] = useState<{suggestion: string, reason: string} | null>(null);

  useEffect(() => {
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propRes, roomsRes] = await Promise.all([
        propertyApi.getDetail(id!),
        propertyApi.getRooms(id!)
      ]);
      setProperty((propRes as { data?: Property }).data || propRes as unknown as Property);
      setRooms((roomsRes as { data?: Room[] }).data || roomsRes as unknown as Room[]);
    } catch {
      toast.error('Không thể tải dữ liệu phòng');
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra có được phép bắt đầu bảo trì không
  const canStartMaintenance = (room: Room): boolean => {
    return room.status === 'AVAILABLE' || room.status === 'MAINTENANCE';
  };

  // Mở modal xác nhận bảo trì
  const openMaintenanceConfirm = (room: Room, type: 'start' | 'complete') => {
    if (type === 'start' && !canStartMaintenance(room)) {
      setCannotMaintenanceRoom({
        name: room.name,
        status: room.status
      });
      setShowCannotMaintenanceModal(true);
      return;
    }

    setPendingMaintenanceAction({ 
      roomId: room.id, 
      roomName: room.name, 
      type 
    });
    setShowMaintenanceConfirm(true);
  };

  // Thực hiện hành động bảo trì
  const executeMaintenanceAction = async () => {
    if (!pendingMaintenanceAction) return;

    const { roomId, roomName, type } = pendingMaintenanceAction;
    
    setShowMaintenanceConfirm(false);
    setMaintenanceRoomId(roomId);
    setIsMaintenanceLoading(true);

    try {
      if (type === 'start') {
        await roomApi.updateRoomVisibility(roomId, 'MAINTENANCE');
        toast.success(`Phòng "${roomName}" đã chuyển sang chế độ bảo trì!`);
      } else {
        await roomApi.updateRoomVisibility(roomId, 'AVAILABLE');
        toast.success(`Đã hoàn thành bảo trì phòng "${roomName}"! Phòng đã sẵn sàng cho thuê.`);
      }
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Không thể cập nhật trạng thái bảo trì');
    } finally {
      setIsMaintenanceLoading(false);
      setMaintenanceRoomId(null);
      setPendingMaintenanceAction(null);
    }
  };

const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const lowerName = file.name.toLowerCase();
  const isExcelFile =
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".csv") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "text/csv";
  if (!isExcelFile) {
    toast.error("Vui lòng chọn file Excel hợp lệ (.xlsx, .xls, .csv).");
    e.target.value = "";
    return;
  }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
        
        const parsedRooms = data.map((row) => {
          const roomName = (row['Tên phòng'] || row['name'])?.toString() || '';
          
          const rawImages = row['Ảnh thường'] || row['images'];
          const normalImgUrls = rawImages 
            ? String(rawImages).split(/[,|]/).map(s => s.trim()).filter(s => s.startsWith('http')) 
            : [];
          
          const rawPano = row['Ảnh 360'] || row['panoramaImages'];
          const panoImgUrls = rawPano 
            ? String(rawPano).split(/[,|]/).map(s => s.trim()).filter(s => s.startsWith('http')) 
            : [];

          const hasMezzanineVal = row['Có gác lửng'] !== undefined ? row['Có gác lửng'] : row['hasMezzanine'];
          const hasBalconyVal = row['Có ban công'] !== undefined ? row['Có ban công'] : row['hasBalcony'];
          const rawAmenities = row['Tiện ích'] || row['amenities'];

          return {
            name: roomName,
            price: Number(row['Giá thuê (VNĐ)'] || row['price']) || 0,
            area: Number(row['Diện tích (m2)'] || row['area']) || 0,
            type: row['Loại phòng'] || row['type'] || 'STUDIO',
            maxOccupants: (row['Sức chứa tối đa'] || row['maxOccupants']) ? Number(row['Sức chứa tối đa'] || row['maxOccupants']) : null,
            hasMezzanine: hasMezzanineVal == 1 || hasMezzanineVal == '1' || String(hasMezzanineVal).toLowerCase() === 'có' || String(hasMezzanineVal).toLowerCase() === 'true',
            hasBalcony: hasBalconyVal == 1 || hasBalconyVal == '1' || String(hasBalconyVal).toLowerCase() === 'có' || String(hasBalconyVal).toLowerCase() === 'true',
            amenities: rawAmenities ? String(rawAmenities).split(/[,|]/).map(s => s.trim()).filter(s => s) : [],
            normalImgUrls,
            panoImgUrls,
            imageStatus: {
              normalCount: normalImgUrls.length,
              normalTotal: normalImgUrls.length,
              hasPano: panoImgUrls.length > 0,
              needsPano: !!rawPano
            }
          };
        });

        setExcelRooms(parsedRooms);
        setShowExcelPreview(true);
      } catch {
        toast.error('Lỗi đọc file Excel. Vui lòng kiểm tra lại định dạng!');
      }
    };
    reader.readAsBinaryString(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };





  const executeExcelImport = async () => {
    try {
      const res = await vipApi.getMyPlan();
      const plan = (res as { data?: { maxRoomsPerProperty: number; tier: string } }).data || res as unknown as { maxRoomsPerProperty: number; tier: string };
      if (plan.maxRoomsPerProperty !== -1 && rooms.length + excelRooms.length > plan.maxRoomsPerProperty) {
        toast.error(`Gói ${plan.tier} chỉ cho phép tối đa ${plan.maxRoomsPerProperty} phòng. Bạn đang tải lên quá giới hạn!`);
        return;
      }
    } catch (vipErr) {
      console.error("Lỗi lấy thông tin VIP", vipErr);
    }

    setIsImporting(true);
    setImportTotal(excelRooms.length);
    setImportProgress(0);
    setImportErrors([]);

    let successCount = 0;
    const errList: {name: string; reason: string}[] = [];

    for (let i = 0; i < excelRooms.length; i++) {
      const room = excelRooms[i];
      if (!room.name || !room.price || !room.area) {
        errList.push({ name: room.name || `Dòng ${i+1}`, reason: 'Thiếu Tên, Giá hoặc Diện tích' });
        setImportProgress(i + 1);
        continue;
      }

      try {
        const uploadedNormalUrls: string[] = room.normalImgUrls || [];
        const uploadedPanoUrls: string[] = room.panoImgUrls || [];

        await propertyApi.createRoom(id!, {
          name: room.name,
          price: room.price,
          area: room.area,
          type: room.type as RoomType,
          hasMezzanine: room.hasMezzanine,
          hasBalcony: room.hasBalcony,
          maxOccupants: room.maxOccupants,
          description: `Phòng ${room.name} sạch sẽ thoáng mát.`,
          amenities: room.amenities,
          images: uploadedNormalUrls,
          panoramaImages: uploadedPanoUrls,
          defaultTerms: ''
        });
        successCount++;
        await new Promise(r => setTimeout(r, 800)); // Delay để AI không bị quá tải
      } catch (err: unknown) {
        const errData = (err as { response?: { data?: { message?: string; type?: string } } })?.response?.data;
        errList.push({ name: room.name, reason: errData?.message || 'Lỗi không xác định' });
        
        if (errData?.type === 'VIP_LIMIT_EXCEEDED') {
            toast.error('Đã đạt giới hạn VIP giữa chừng. Dừng tải lên!');
            break;
        }
      }
      setImportProgress(i + 1);
    }

    setIsImporting(false);
    toast.success(`Đã thêm thành công ${successCount} phòng!`);
    if (errList.length === 0) {
      setShowExcelPreview(false);
    }
    setImportErrors(errList);
    fetchData();
  };

  // --- LOGIC AI GỢI Ý GIÁ ---
  const handleSuggestPrice = async () => {
    if (!formData.area || !formData.type) {
      toast.warning('Vui lòng nhập Diện tích và Loại phòng để AI gợi ý chính xác hơn');
      return;
    }

    setIsSuggestingPrice(true);
    setPriceSuggestion(null);

    try {
      const res = await propertyApi.suggestRoomPrice({
        district: property?.district || '',
        city: property?.city || '',
        area: Number(formData.area),
        type: formData.type,
        amenities: [...formData.amenities, ...formData.customAmenitiesInput.split(',').map(s => s.trim()).filter(s => s)]
      });
      setPriceSuggestion((res as { data?: { suggestion: string; reason: string } }).data || res as unknown as { suggestion: string; reason: string });
    } catch {
      toast.error('Không thể lấy gợi ý giá lúc này');
    } finally {
      setIsSuggestingPrice(false);
    }
  };

  const applyPriceSuggestion = () => {
    if (!priceSuggestion) return;
    // Lấy con số đầu tiên trong chuỗi khoảng giá (VD: "3.500.000 - 4.000.000" -> 3500000)
    const matches = priceSuggestion.suggestion.replace(/\./g, '').match(/\d+/);
    if (matches) {
      setFormData({ ...formData, price: matches[0] });
      setAppliedSuggestion(priceSuggestion); // Lưu lại để hiển thị sau khi áp dụng
      setPriceSuggestion(null);
      toast.success('Đã áp dụng mức giá gợi ý!');
    }
  };

  // --- MỞ MODAL THÊM PHÒNG ---
  const handleOpenCreate = async () => {
    try {
      const res = await vipApi.getMyPlan();
      const plan = (res as { data?: { maxRoomsPerProperty: number; tier: string } }).data || res as unknown as { maxRoomsPerProperty: number; tier: string };
      
      // Kiểm tra giới hạn phòng
      if (plan.maxRoomsPerProperty !== -1 && rooms.length >= plan.maxRoomsPerProperty) {
        setVipLimit({
          isOpen: true,
          limitType: 'ROOM',
          currentTier: plan.tier,
          currentCount: rooms.length,
          maxAllowed: plan.maxRoomsPerProperty,
          message: `Gói ${plan.tier} chỉ cho phép tạo tối đa ${plan.maxRoomsPerProperty} phòng trên mỗi khu trọ.`
        });
        return; // Dừng lại, không mở modal
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra gói VIP:", error);
      // Tiếp tục mở modal nếu có lỗi mạng
    }
    setEditingId(null);
    // Lưu ý: Không reset formData ở đây để useAutoSaveForm có thể khôi phục draft khi showModal = true
    imageQueue.resetQueue();
    panoQueue.resetQueue();
    setPriceSuggestion(null);
    setAppliedSuggestion(null);
    setRoomStep(1);
    setShowModal(true);
  };

  // --- NHÂN BẢN PHÒNG ---
  const handleDuplicate = async (room: Room) => {
    if (!room) {
      toast.error('Không tìm thấy dữ liệu phòng để sao chép');
      return;
    }

    setEditingId(null);

    let rawAmenities: string[] = [];
    try {
      rawAmenities = Array.isArray(room.amenities) 
        ? room.amenities 
        : JSON.parse(room.amenities || '[]');
    } catch {
      rawAmenities = [];
    }

    const standardAmenities: string[] = [];
    const customAmenities: string[] = [];

    rawAmenities.forEach((item: string) => {
      if (COMMON_AMENITIES.includes(item)) {
        standardAmenities.push(item);
      } else {
        customAmenities.push(item);
      }
    });

    setFormData({
      name: '', 
      price: room.price?.toString() || '', 
      area: room.area?.toString() || '',
      description: room.description || '', 
      type: room.type || 'STUDIO',
      hasMezzanine: room.hasMezzanine ?? false,
      hasBalcony: room.hasBalcony ?? false,
      maxOccupants: room.maxOccupants?.toString() || '',
      amenities: standardAmenities,
      customAmenitiesInput: customAmenities.join(', '), 
      images: [],
      panoramaImages: [],
      defaultTerms: room.defaultTerms || '',
      version: undefined
    });

    imageQueue.resetQueue();
    panoQueue.resetQueue();
    setRoomStep(1);
    setShowModal(true);
    
    toast.info('Đã sao chép thông tin! Vui lòng nhập Số phòng mới.');
  };

  const handleOpenEdit = (room: Room) => { 
    setEditingId(room.id);
    
    const cacheKey = `draft_room_form_${id}_edit_${room.id}_${user?.id || 'guest'}`;
    const cached = localStorage.getItem(cacheKey);

    // Reset queue trước
    imageQueue.resetQueue();
    panoQueue.resetQueue();

    if (cached) {
      const draft = JSON.parse(cached);
      setFormData(draft);
      toast.info('Đã khôi phục bản nháp chỉnh sửa phòng dở.', { duration: 4000 });

      // Đưa URL đã lưu trong draft vào queue dạng "success"
      if (draft.images?.length > 0) imageQueue.addExistingUrls(draft.images);
      if (draft.panoramaImages?.length > 0) panoQueue.addExistingUrls(draft.panoramaImages);

      setRoomStep(1);
      setShowModal(true);
      return;
    }

    const standardAmenities: string[] = [];
    const customAmenities: string[] = [];
    
    (room.amenities || []).forEach((item: string) => {
      if (COMMON_AMENITIES.includes(item)) {
        standardAmenities.push(item);
      } else {
        customAmenities.push(item);
      }
    });

    // Load ảnh hiện tại từ server vào queue
    const existingImages = room.images || [];
    const existingPano = room.panoramaImages || [];
    if (existingImages.length > 0) imageQueue.addExistingUrls(existingImages);
    if (existingPano.length > 0) panoQueue.addExistingUrls(existingPano);

    setFormData({
      name: room.name, 
      price: room.price.toString(), 
      area: room.area.toString(),
      description: room.description || '', 
      type: room.type || 'STUDIO',
      hasMezzanine: room.hasMezzanine ?? false,
      hasBalcony: room.hasBalcony ?? false,
      maxOccupants: room.maxOccupants?.toString() || '',
      amenities: standardAmenities,
      customAmenitiesInput: customAmenities.join(', '), 
      images: existingImages,
      panoramaImages: existingPano,
      defaultTerms: room.defaultTerms || '',
      version: room.version
    });
    setPriceSuggestion(null);
    setAppliedSuggestion(null);
    setRoomStep(1);
    setShowModal(true);
  };

  // --- XỬ LÝ CHECKBOX TIỆN ÍCH ---
  const handleToggleAmenity = (amenity: string) => {
    setFormData(prev => {
      const isSelected = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: isSelected 
          ? prev.amenities.filter(item => item !== amenity) 
          : [...prev.amenities, amenity] 
      };
    });
  };

  // ✅ XỬ LÝ THÊM ĐIỀU KHOẢN GỢI Ý
  const handleAddTerm = (term: string) => {
    if (formData.defaultTerms.includes(term)) {
      toast.info("Điều khoản này đã được thêm rồi!");
      return;
    }
    setFormData(prev => ({
      ...prev,
      defaultTerms: prev.defaultTerms 
        ? `${prev.defaultTerms}\n- ${term}` 
        : `- ${term}`
    }));
  };

  // ✅ XỬ LÝ TOGGLE RULE (VD: Cho nuôi thú cưng ↔ Không cho nuôi)
  const handleToggleRule = (positiveText: string, negativeText: string) => {
    const hasPositive = formData.defaultTerms.includes(positiveText);
    const hasNegative = formData.defaultTerms.includes(negativeText);

    setFormData(prev => {
      let newTerms = prev.defaultTerms;
      if (hasPositive) {
        // Đang "Cho" → chuyển thành "Không cho"
        newTerms = newTerms.replace(`- ${positiveText}`, `- ${negativeText}`);
      } else if (hasNegative) {
        // Đang "Không cho" → chuyển thành "Cho"
        newTerms = newTerms.replace(`- ${negativeText}`, `- ${positiveText}`);
      } else {
        // Chưa có → thêm mới dạng "Cho"
        newTerms = newTerms ? `${newTerms}\n- ${positiveText}` : `- ${positiveText}`;
      }
      return { ...prev, defaultTerms: newTerms };
    });
  };

  const handleRemoveRule = (ruleText: string) => {
    setFormData(prev => ({
      ...prev,
      defaultTerms: prev.defaultTerms
        .replace(`\n- ${ruleText}`, '')
        .replace(`- ${ruleText}\n`, '')
        .replace(`- ${ruleText}`, '')
        .trim()
    }));
  };

  // --- XỬ LÝ ẢNH (thông qua UploadQueue) ---
  // Ảnh thường: filter 5MB, nén tự động bởi hook
  const handleAddImages = (files: File[]) => {
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024);
    if (valid.length < files.length) {
      toast.warning(`${files.length - valid.length} ảnh quá lớn (>5MB) đã bị bỏ qua.`);
    }
    if (valid.length > 0) imageQueue.addFiles(valid);
  };

  // Ảnh 360: filter 10MB, giới hạn tổng 5
  const handleAddPanoImages = (files: File[]) => {
    const totalCurrent = panoQueue.items.length;
    const remaining = 5 - totalCurrent;
    if (remaining <= 0) {
      toast.warning('Tối đa 5 ảnh 360 độ mỗi phòng!');
      return;
    }
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024).slice(0, remaining);
    if (valid.length < files.length) {
      toast.warning('Một số ảnh quá lớn (>10MB) hoặc vượt giới hạn đã bị bỏ qua.');
    }
    if (valid.length > 0) panoQueue.addFiles(valid);
  };

  // --- TÍCH HỢP AI TẠO MÔ TẢ ---
  const handleGenerateAI = async () => {
    if (!formData.name || !formData.area || !formData.price) {
      toast.warning('Vui lòng nhập Tên, Diện tích và Giá thuê để AI có dữ liệu viết bài!');
      return;
    }
    try {
      setIsGeneratingAI(true);
      const allAmenities = [...formData.amenities, formData.customAmenitiesInput].filter(Boolean).join(', ');
      
      let tonePrompt = "Mô tả chuẩn SEO, hấp dẫn, dễ đọc.";
      if (aiTone === 'GENZ') tonePrompt = "Giọng văn gần gũi, thân thiện, dùng ngôn ngữ trẻ trung phù hợp sinh viên.";
      if (aiTone === 'PRO') tonePrompt = "Phong cách chuyên nghiệp, lịch sự, nhắm tới người đi làm hoặc gia đình nhỏ.";

      const keywords = `Tên phòng hoặc số phòng: ${formData.name}. Diện tích: ${formData.area}m2. Giá thuê: ${formData.price} VND/tháng. \nTiện ích có sẵn: ${allAmenities}.\nYêu cầu viết: ${tonePrompt}`;
      
      const res = await propertyApi.generateRoomDescription(keywords);
      const generatedText = (res as { data?: { description?: string } }).data?.description || (res as unknown as { description?: string })?.description || ''; 
      
      setAiContentPreview(generatedText); // Bật preview modal
    } catch {
      toast.error('Lỗi khi gọi AI. Tính năng đang bảo trì.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAcceptAiContent = () => {
    if (aiContentPreview) {
      setFormData(prev => ({ ...prev, description: aiContentPreview }));
      setAiContentPreview(null);
      toast.success('Đã áp dụng nội dung AI!');
    }
  };

  // --- LƯU PHÒNG ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.area) {
      toast.warning('Vui lòng nhập đủ thông tin bắt buộc!');
      return;
    }

    try {
      setIsSubmitting(true);

      // Lấy toàn bộ URL ảnh success từ queue (bao gồm ảnh cũ + ảnh mới đã upload xong)
      const allImageUrls = imageQueue.successUrls;
      const allPanoUrls = panoQueue.successUrls;

      const parsedCustomAmenities = formData.customAmenitiesInput
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      const finalAmenities = [...formData.amenities, ...parsedCustomAmenities];

      const payload = {
        name: formData.name,
        price: Number(formData.price),
        area: Number(formData.area),
        type: formData.type,
        hasMezzanine: formData.hasMezzanine,
        hasBalcony: formData.hasBalcony,
        maxOccupants: formData.maxOccupants ? Number(formData.maxOccupants) : null,
        description: formData.description,
        amenities: finalAmenities,
        images: allImageUrls,
        panoramaImages: allPanoUrls,
        defaultTerms: formData.defaultTerms,
        version: editingId ? formData.version : undefined
      };

      if (editingId) {
        await propertyApi.updateRoom(editingId, payload);
        toast.success('Cập nhật phòng thành công!');
      } else {
        await propertyApi.createRoom(id!, payload);
        toast.success('Thêm phòng mới thành công! Admin sẽ kiểm duyệt trước khi hiển thị công khai.');
      }
      
      clearDraft();
      imageQueue.clearQueue();
      panoQueue.clearQueue();

      setShowModal(false);
      fetchData(); 
    } catch (error: unknown) {
      const customError = error as { response?: { status?: number; data?: { code?: string; type?: string; limitType?: string; currentTier?: string; currentCount?: number; maxAllowed?: number; message?: string } } };
      const errResp = customError.response;
      const errData = errResp?.data;

      if (errResp?.status === 409 && errData?.code === 'CONFLICT_RESOURCE_VERSION') {
        setIsSubmitting(false);
        toast.error('Dữ liệu đã được thay đổi ở nơi khác. Vui lòng tải lại trước khi lưu.', {
          action: {
            label: 'Tải lại',
            onClick: () => { 
              fetchData(); 
              setShowModal(false); 
            }
          },
          duration: 8000
        });
        return;
      }

      if (errData?.type === 'VIP_LIMIT_EXCEEDED' || errData?.code === 'VIP_LIMIT_EXCEEDED') {
        setShowModal(false);
        setVipLimit({
          isOpen: true,
          limitType: errData.limitType || '',
          currentTier: errData.currentTier || '',
          currentCount: errData.currentCount || 0,
          maxAllowed: errData.maxAllowed || 0,
          message: errData.message || '',
        });
      } else {
        toast.error(errData?.message || (editingId ? 'Cập nhật thất bại' : 'Thêm mới thất bại'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const propertyOps = useMemo(() => {
    // Chỉ tính phòng đã được duyệt vào thống kê hoạt động
    const approvedRooms = rooms.filter((r) => r.approvalStatus === 'APPROVED');
    const vacant = approvedRooms.filter((r) => r.status === 'AVAILABLE').length;
    const rented = approvedRooms.filter((r) => r.status === 'RENTED').length;
    const maintenance = approvedRooms.filter((r) => r.status === 'MAINTENANCE').length;
    const reserved = approvedRooms.filter((r) => r.status === 'RESERVED').length;
    const vacantRevenue = approvedRooms
      .filter((r) => r.status === 'AVAILABLE')
      .reduce((sum, r) => sum + Number(r.price || 0), 0);
    const rentedYield = approvedRooms
      .filter((r) => r.status === 'RENTED')
      .reduce((sum, r) => sum + Number(r.price || 0), 0);
    const pendingApproval = rooms.filter((r) => r.approvalStatus === 'PENDING').length;
    const rejected = rooms.filter((r) => r.approvalStatus === 'REJECTED').length;

    const summary: SummaryStripItem[] = [
      { id: 'rooms', label: 'Tổng phòng', value: rooms.length, subline: 'Trong khu trọ này' },
      { id: 'vacant', label: 'Đang trống', value: vacant, tone: vacant > 0 ? 'warning' : 'muted', subline: 'Đã duyệt, có thể nhận khách' },
      { id: 'rented', label: 'Đang cho thuê', value: rented, tone: rented > 0 ? 'success' : 'muted', subline: 'Đang sinh doanh thu' },
      { id: 'maint', label: 'Bảo trì', value: maintenance, tone: maintenance > 0 ? 'warning' : 'muted', subline: 'Không nhận xem phòng' },
      ...(pendingApproval > 0 ? [{ id: 'pending', label: 'Chờ duyệt', value: pendingApproval, tone: 'warning' as const, subline: 'Chưa hiển thị công khai' }] : []),
      ...(rejected > 0 ? [{ id: 'rejected', label: 'Bị từ chối', value: rejected, tone: 'danger' as const, subline: 'Cần chỉnh sửa & gửi lại' }] : []),
      {
        id: 'vac-rev',
        label: 'Tiềm năng thu (trống)',
        value: vacant ? `${vacantRevenue.toLocaleString('vi-VN')} đ` : '—',
        subline: 'Tổng giá niêm yết phòng trống',
        tone: vacant > 0 ? 'default' : 'muted',
      },
      {
        id: 'run',
        label: 'Doanh thu ước (đang thuê)',
        value: rented ? `${rentedYield.toLocaleString('vi-VN')} đ/tháng` : '—',
        subline: 'Theo giá phòng đang cho thuê',
        tone: rented > 0 ? 'success' : 'muted',
      },
    ];

    return { vacant, rented, maintenance, reserved, pendingApproval, vacantRevenue, summary };
  }, [rooms]);

  if (loading) {
    return (
      <div className="min-w-0 space-y-6">
        <Skeleton className="h-4 w-48 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-full max-w-md rounded-lg" />
          <Skeleton className="h-4 w-full max-w-xl rounded-md" />
        </div>
        <Skeleton className="h-11 w-full max-w-xs rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  if (!property) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <EmptyState icon={Building} title="Không tìm thấy khu trọ" description="Kiểm tra đường dẫn hoặc quay lại danh sách." />
      </div>
    );
  }

  return (
    <>
      <FormBlocker isDirty={showModal && isDirty} />
    <div className="min-w-0 space-y-6 overflow-x-hidden pb-8">
      <Link
        to="/landlord/properties"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" /> Danh sách khu trọ
      </Link>

      <PageHeader
        title={property.name}
        description={property.address}
        actions={
          <div className="flex gap-2 flex-col md:flex-row w-full md:w-auto">
            <input
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              ref={excelInputRef}
              onClick={(e) => {
                (e.currentTarget as HTMLInputElement).value = "";
              }}
              onChange={handleExcelImport}
              className="hidden"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => excelInputRef.current?.click()} 
              className="min-h-11 w-full md:w-auto shrink-0 gap-2 border-primary text-primary hover:bg-primary/10"
              title="Chọn file Excel để nhập phòng hàng loạt"
            >
              <ScrollText className="h-4 w-4" /> Nhập từ Excel
            </Button>
            <Button type="button" onClick={handleOpenCreate} className="min-h-11 w-full md:w-auto shrink-0 gap-2">
              <Plus className="h-4 w-4" /> Thêm phòng
            </Button>
          </div>
        }
      />

      <StatusSummaryStrip items={propertyOps.summary} />

      {propertyOps.pendingApproval > 0 ? (
        <AttentionBanner
          tone="warning"
          title={`${propertyOps.pendingApproval} phòng chờ duyệt nội dung`}
          description="Hoàn tất duyệt để hiển thị công khai và nhận lịch xem phòng."
          icon={AlertTriangle}
        />
      ) : null}
      {propertyOps.maintenance > 0 ? (
        <AttentionBanner
          tone="info"
          title={`${propertyOps.maintenance} phòng đang bảo trì`}
          description="Khách không thể đặt lịch — hoàn tất bảo trì khi sẵn sàng cho thuê lại."
          icon={Wrench}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Layers}
              title="Chưa có phòng trong khu trọ"
              description="Thêm phòng để hiển thị công khai và nhận yêu cầu thuê."
            />
            <div className="mt-4 flex justify-center">
              <Button type="button" onClick={handleOpenCreate} variant="outline" className="min-h-11">
                Thêm phòng đầu tiên
              </Button>
            </div>
          </div>
        ) : (
          rooms.map(room => (
            <div 
              key={room.id} 
              className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft transition-all duration-200 hover:border-primary/20 hover:shadow-card"
              onClick={() => window.location.href = `/landlord/properties/${id}/rooms/${room.id}`}
            >
              {/* Ảnh phòng */}
              <div className="relative h-40 bg-muted">
                {room.images && room.images.length > 0 ? (
                  <img src={room.images[0]} alt="Room" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">Chưa có ảnh</div>
                )}
                
                {/* Trạng thái phòng */}
                <span className={`absolute top-2 right-2 px-3 py-1 rounded-md text-xs font-bold shadow-sm flex items-center gap-1 ${
                  room.status === 'AVAILABLE' ? 'bg-green-500 text-white' : 
                  room.status === 'RENTED' && room.availableFromDate ? 'bg-orange-500 text-white' :
                  room.status === 'RENTED' ? 'bg-blue-600 text-white' :
                  room.status === 'MAINTENANCE' ? 'bg-orange-500 text-white' :
                  room.status === 'RESERVED' ? 'bg-amber-500 text-white' : 
                  'bg-muted/400 text-white'
                }`}>
                  {room.status === 'AVAILABLE' && <><CheckCircle className="h-3.5 w-3.5" /> Trống</>}
                  {room.status === 'RENTED' && room.availableFromDate && <><Clock className="h-3.5 w-3.5" /> Sắp trống ({formatDate(room.availableFromDate)})</>}
                  {room.status === 'RENTED' && !room.availableFromDate && <><Users className="h-3.5 w-3.5" /> Đã thuê</>}
                  {room.status === 'MAINTENANCE' && (
                    <>
                      <Wrench className="h-3.5 w-3.5" /> Đang bảo trì
                    </>
                  )}
                  {room.status === 'RESERVED' && <><Lock className="h-3.5 w-3.5" /> Giữ chỗ</>}
                  {room.status === 'HIDDEN' && 'Ẩn'}
                </span>

                {/* Nhãn trạng thái duyệt */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {room.approvalStatus === 'PENDING' && (
                    <span className="px-2 py-0.5 bg-yellow-500/90 text-white text-[10px] font-bold rounded-md shadow-sm backdrop-blur-sm">
                      CHỜ DUYỆT
                    </span>
                  )}
                  {room.approvalStatus === 'REJECTED' && (
                    <span className="px-2 py-0.5 bg-red-500/90 text-white text-[10px] font-bold rounded-md shadow-sm backdrop-blur-sm">
                      BỊ TỪ CHỐI
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin phòng */}
              <div className="p-4 flex-1 flex flex-col">
                {room.approvalStatus === 'REJECTED' && (room as Room & { moderationReason?: string }).moderationReason && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Lý do từ chối:</p>
                      <p className="line-clamp-2">{(room as Room & { moderationReason?: string }).moderationReason}</p>
                    </div>
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                  Phòng {room.name}
                </h3>

                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-xs font-medium text-gray-500">
                    {ROOM_TYPE_LABELS[(room.type as RoomType) || 'STUDIO']}
                  </span>
                  {room.hasMezzanine && <StatusBadge label="Gác lửng" tone="warning" className="text-[10px] font-medium" />}
                  {room.hasBalcony && <StatusBadge label="Ban công" tone="info" className="text-[10px] font-medium" />}
                </div>

                <div className="space-y-1.5 text-sm text-gray-600 mb-4 flex-1">
                  <p className="flex justify-between">
                    <span>Giá thuê:</span> 
                    <strong className="text-primary">{room.price?.toLocaleString()}đ</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Diện tích:</span> 
                    <strong className="text-gray-900">{room.area} m²</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2" title={room.amenities?.join(', ')}>
                    Tiện ích: {room.amenities?.length ? room.amenities.join(', ') : 'Chưa cập nhật'}
                  </p>
                </div>

                {/* AI Safety Score */}
                {(room as Room & { safetyScore?: number }).safetyScore != null && (
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    {(room as Room & { safetyScore?: number }).safetyScore! >= 80 ? (
                      <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                        <ShieldCheck className="h-3 w-3" /> AI: {(room as Room & { safetyScore?: number }).safetyScore}/100
                      </span>
                    ) : (room as Room & { safetyScore?: number }).safetyScore! >= 50 ? (
                      <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                        <AlertTriangle className="h-3 w-3" /> AI: {(room as Room & { safetyScore?: number }).safetyScore}/100
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                        <ShieldAlert className="h-3 w-3" /> AI: {(room as Room & { safetyScore?: number }).safetyScore}/100
                      </span>
                    )}
                  </div>
                )}

                {/* NÚT THAO TÁC */}
                <div className="flex gap-2 border-t pt-4 mt-auto flex-wrap" onClick={e => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(room); }}
                  >
                    <Edit className="h-4 w-4 mr-1.5" /> Sửa
                  </Button>
                  
                    {room.status !== 'HIDDEN' && (
                      <>
                        {room.status === 'MAINTENANCE' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              openMaintenanceConfirm(room, 'complete');
                            }}
                            disabled={isMaintenanceLoading && maintenanceRoomId === room.id}
                          >
                            {isMaintenanceLoading && maintenanceRoomId === room.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1.5" /> Hoàn thành
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              openMaintenanceConfirm(room, 'start');
                            }}
                            disabled={isMaintenanceLoading && maintenanceRoomId === room.id}
                          >
                            {isMaintenanceLoading && maintenanceRoomId === room.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Wrench className="h-4 w-4 mr-1.5" /> Bảo trì
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}

                    {room.status !== 'HIDDEN' && room.status !== 'MAINTENANCE' && (
                      <div className="flex-1 flex"> 
                        {room.status === 'AVAILABLE' ? (
                          <Link 
                            to={`/landlord/contracts/create?roomId=${room.id}`} 
                            className="flex-1" 
                            onClick={e => e.stopPropagation()}
                          >
                            <Button variant="outline" size="sm" className="w-full text-green-600 border-green-200 hover:bg-green-50">
                              <FileSignature className="h-4 w-4 mr-1.5" /> Tạo HĐ
                            </Button>
                          </Link>
                        ) : (
                          <Link 
                            to={`/landlord/contracts/${room.id}`} 
                            className="flex-1" 
                            onClick={e => e.stopPropagation()}
                          >
                            <Button variant="outline" size="sm" className="w-full text-purple-600 border-purple-200 hover:bg-purple-50">
                              <FileText className="h-4 w-4 mr-1.5" /> Xem HĐ
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-violet-500 border-violet-200 hover:bg-violet-50 px-2"
                    onClick={(e) => { e.stopPropagation(); handleDuplicate(room); }}
                    title="Nhân bản phòng này"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MODAL THÊM/SỬA PHÒNG --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex flex-col bg-muted/40 flex-shrink-0 relative">
              <button type="button" onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Đóng"><X className="h-5 w-5" /></button>
              <h2 className="text-xl font-bold text-gray-800 mb-4">{editingId ? 'Cập nhật phòng' : 'Thêm phòng mới'}</h2>
              
              {/* Stepper Header */}
              <div className="flex items-center justify-between relative max-w-2xl mx-auto w-full">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full z-0"></div>
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-300" 
                  style={{ width: `${((roomStep - 1) / 3) * 100}%` }}
                ></div>
                
                <div className="relative z-10 flex flex-col items-center gap-1 cursor-pointer" onClick={() => setRoomStep(1)}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${roomStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                  <span className={`text-[10px] font-medium ${roomStep >= 1 ? 'text-primary' : 'text-gray-500'}`}>Cơ bản</span>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-1 cursor-pointer" onClick={() => { if(formData.name && formData.area && formData.price) setRoomStep(2); else toast.warning('Điền đủ thông tin cơ bản trước') }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${roomStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                  <span className={`text-[10px] font-medium ${roomStep >= 2 ? 'text-primary' : 'text-gray-500'}`}>Tiện ích</span>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-1 cursor-pointer" onClick={() => { if(formData.name && formData.area && formData.price) setRoomStep(3); else toast.warning('Điền đủ thông tin cơ bản trước') }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${roomStep >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                  <span className={`text-[10px] font-medium ${roomStep >= 3 ? 'text-primary' : 'text-gray-500'}`}>Mô tả</span>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-1 cursor-pointer" onClick={() => { if(formData.name && formData.area && formData.price) setRoomStep(4); else toast.warning('Điền đủ thông tin cơ bản trước') }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${roomStep >= 4 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>4</div>
                  <span className={`text-[10px] font-medium ${roomStep >= 4 ? 'text-primary' : 'text-gray-500'}`}>Hình ảnh</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="room-form" onSubmit={(e) => {
                e.preventDefault();
                if (roomStep < 4) {
                  if (roomStep === 1 && (!formData.name || !formData.area || !formData.price)) {
                    toast.warning('Vui lòng điền đủ thông tin bắt buộc (*)');
                    return;
                  }
                  setRoomStep(roomStep + 1);
                } else {
                  handleSubmit(e);
                }
              }} className="space-y-6">
                
                {/* STEP 1: Thông tin cơ bản */}
                {roomStep === 1 && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-2">
                      <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-1"><Building className="h-4 w-4" /> Thông tin Cơ bản</h3>
                      <p className="text-xs text-blue-700">Thông tin cơ bản về phòng trọ.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng (VD: 101) *</label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Diện tích (m²) *</label>
                        <input required type="number" step="0.1" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
                          <span>Giá thuê (VND) *</span>
                          <button 
                            type="button"
                            onClick={handleSuggestPrice}
                            disabled={isSuggestingPrice}
                            className="text-[10px] flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded hover:bg-purple-100 transition-colors border border-purple-100"
                          >
                            {isSuggestingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            Gợi ý giá AI
                          </button>
                        </label>
                        <CurrencyInput required value={formData.price} onChange={val => setFormData({...formData, price: val})} className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" placeholder="VD: 3.000.000" />
                        
                        {/* MODAL GỢI Ý ĐANG CHỌN */}
                        {priceSuggestion && (
                          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-purple-200 rounded-lg shadow-xl p-3 animate-in fade-in slide-in-from-top-1">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-bold text-purple-900 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> AI Đề xuất
                              </p>
                              <button type="button" onClick={() => setPriceSuggestion(null)} className="text-gray-400 hover:text-gray-600" aria-label="Đóng gợi ý"><X className="h-3 w-3" /></button>
                            </div>
                            <p className="text-sm font-black text-purple-700 mb-1">{priceSuggestion.suggestion} <span className="text-[10px] font-normal text-gray-400">VND/tháng</span></p>
                            <p className="text-[10px] text-gray-600 mb-3 leading-relaxed bg-purple-50 p-2 rounded-md italic">"{priceSuggestion.reason}"</p>
                            <div className="flex gap-2">
                              <Button 
                                type="button"
                                size="sm"
                                onClick={applyPriceSuggestion}
                                className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700 w-full"
                              >
                                Áp dụng ngay
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* HIỂN THỊ LẠI GỢI Ý ĐÃ ÁP DỤNG (DƯỚI Ô INPUT) */}
                        {appliedSuggestion && !priceSuggestion && (
                          <div className="mt-1.5 p-2 bg-purple-50 border border-purple-100 rounded-md animate-in fade-in">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-600 text-white text-[9px] font-bold rounded-full uppercase tracking-tighter">
                                <Sparkles className="h-2.5 w-2.5" /> AI Recommended
                              </div>
                              <span className="text-[10px] font-bold text-purple-800">{appliedSuggestion.suggestion}</span>
                            </div>
                            <p className="text-[9px] text-purple-600/80 leading-tight italic">
                              "{appliedSuggestion.reason}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Số người tối đa */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-gray-500" /> Số người tối đa
                      </label>
                      <input type="number" min="1" value={formData.maxOccupants} onChange={e => setFormData({...formData, maxOccupants: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none" placeholder="VD: 3" />
                    </div>

                    {/* Loại phòng + Không gian */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5 text-gray-500" /> Loại phòng
                        </label>
                        <select
                          value={formData.type}
                          onChange={e => setFormData({...formData, type: e.target.value as RoomType})}
                          className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-primary outline-none bg-white"
                        >
                          {(Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map(key => (
                            <option key={key} value={key}>{ROOM_TYPE_LABELS[key]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2.5 cursor-pointer bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 hover:bg-amber-100 transition w-full">
                          <input
                            type="checkbox"
                            checked={formData.hasMezzanine}
                            onChange={e => setFormData({...formData, hasMezzanine: e.target.checked})}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-amber-800">Có gác lửng</span>
                        </label>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2.5 cursor-pointer bg-sky-50 border border-sky-200 rounded-lg px-4 py-2.5 hover:bg-sky-100 transition w-full">
                          <input
                            type="checkbox"
                            checked={formData.hasBalcony}
                            onChange={e => setFormData({...formData, hasBalcony: e.target.checked})}
                            className="rounded border-gray-300 text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-sky-800">Có ban công</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: TIỆN ÍCH */}
                {roomStep === 2 && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 mb-2">
                      <h3 className="font-semibold text-emerald-900 flex items-center gap-2 mb-1"><CheckSquare className="h-4 w-4" /> Tiện ích có sẵn</h3>
                      <p className="text-xs text-emerald-700">Chọn các tiện ích đã được trang bị sẵn trong phòng.</p>
                    </div>
                    
                    <div className="bg-muted/40 p-4 rounded-xl border border-gray-200">
                      <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-primary" /> Tiện ích có sẵn
                      </label>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                        {COMMON_AMENITIES.map((amenity) => (
                          <label key={amenity} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              checked={formData.amenities.includes(amenity)}
                              onChange={() => handleToggleAmenity(amenity)}
                            />
                            <span className="text-sm text-gray-700 group-hover:text-primary transition-colors">{amenity}</span>
                          </label>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tiện ích khác (Ngăn cách bằng dấu phẩy)</label>
                        <input 
                          type="text" 
                          placeholder="VD: Cửa sổ lớn, Máy nước nóng lạnh, Lò vi sóng..." 
                          value={formData.customAmenitiesInput} 
                          onChange={e => setFormData({...formData, customAmenitiesInput: e.target.value})} 
                          className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-primary outline-none text-sm bg-white" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: MÔ TẢ & NỘI QUY */}
                {roomStep === 3 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-right-4">
                    {/* AI Mô tả */}
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col">
                      <div className="flex justify-between items-end mb-2 border-b border-purple-100 pb-2">
                        <label className="block text-sm font-bold text-purple-900 flex items-center gap-1"><Sparkles className="h-4 w-4" /> Copilot Viết Mô Tả</label>
                      </div>
                      
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-purple-800 font-medium">Giọng văn:</span>
                        <select 
                          value={aiTone} 
                          onChange={e => setAiTone(e.target.value as 'SEO' | 'GENZ' | 'PRO')}
                          className="text-xs border border-purple-200 rounded px-2 py-1 bg-white outline-none text-purple-900 focus:ring-1 focus:ring-purple-400"
                        >
                          <option value="SEO">🔥 Tiêu chuẩn (Chuẩn SEO)</option>
                          <option value="GENZ">🎓 Sinh viên (Gần gũi, GenZ)</option>
                          <option value="PRO">💼 Chuyên nghiệp (Dành cho Căn hộ)</option>
                        </select>
                        
                        <Button type="button" size="sm" onClick={handleGenerateAI} disabled={isGeneratingAI} className="ml-auto bg-purple-600 hover:bg-purple-700 text-white shadow-sm h-7 px-2.5 text-xs rounded-md">
                          {isGeneratingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                          Tạo nội dung ngay
                        </Button>
                      </div>

                      <textarea rows={5} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full flex-1 border-purple-200 p-3 rounded-md focus:ring-2 focus:ring-purple-400 outline-none bg-white resize-none text-sm leading-relaxed" placeholder="Bạn có thể tự nhập mô tả hoặc sử dụng AI để tạo tự động..." />
                      <p className="text-[11px] text-purple-700 mt-2 opacity-80 italic">💡 Copilot sẽ quét Tên phòng, Giá, Diện tích và Tiện ích để tự động viết bài quảng cáo thay bạn.</p>
                    </div>

                    {/* Điều khoản & Nội quy mẫu */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col">
                      <div className="flex justify-between items-end mb-3">
                        <label className="block text-sm font-bold text-blue-900 flex items-center gap-1">
                          <ScrollText className="h-4 w-4" /> Nội quy phòng
                        </label>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        {RULE_CATEGORIES.map((cat, catIdx) => (
                          <div key={catIdx}>
                            <p className="text-xs font-bold text-gray-600 mb-1.5">{cat.label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {cat.rules.map((rule, rIdx) => {
                                const isToggle = !!rule.toggle;
                                const hasPositive = formData.defaultTerms.includes(rule.text);
                                const hasNegative = isToggle && formData.defaultTerms.includes(rule.toggle!);
                                const isActive = hasPositive || hasNegative;

                                if (isToggle) {
                                  return (
                                    <div key={rIdx} className="flex items-center gap-0 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleRule(rule.text, rule.toggle!)}
                                        className={`text-[11px] px-2.5 py-1.5 transition-all font-medium ${
                                          hasPositive
                                            ? 'bg-green-500 text-white'
                                            : 'bg-white text-gray-500 hover:bg-green-50'
                                        }`}
                                      >
                                        ✓ Cho phép
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (hasNegative) { handleRemoveRule(rule.toggle!); }
                                          else { handleToggleRule(rule.toggle!, rule.text); }
                                        }}
                                        className={`text-[11px] px-2.5 py-1.5 transition-all font-medium ${
                                          hasNegative
                                            ? 'bg-red-500 text-white'
                                            : 'bg-white text-gray-500 hover:bg-red-50'
                                        }`}
                                      >
                                        ✗ Cấm
                                      </button>
                                      <span className={`text-[11px] px-2 py-1.5 bg-gray-50 text-gray-600 border-l ${
                                        !isActive ? '' : ''
                                      }`}>Thú cưng</span>
                                      {isActive && (
                                        <button type="button" onClick={() => handleRemoveRule(hasPositive ? rule.text : rule.toggle!)} className="px-1.5 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                }

                                return (
                                  <span
                                    key={rIdx}
                                    onClick={() => {
                                      if (hasPositive) { handleRemoveRule(rule.text); }
                                      else { handleAddTerm(rule.text); }
                                    }}
                                    className={`text-[11px] px-2.5 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 border cursor-pointer select-none ${
                                      hasPositive 
                                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300 active:scale-95'
                                    }`}
                                  >
                                    <span className="font-bold text-[10px]">
                                      {hasPositive ? '✓' : '+'}
                                    </span> 
                                    {rule.text.replace(/\.$/, '')}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <textarea 
                        rows={5} 
                        value={formData.defaultTerms} 
                        onChange={e => setFormData({...formData, defaultTerms: e.target.value})} 
                        className="w-full flex-1 border-blue-200 p-3 rounded-md focus:ring-2 focus:ring-blue-400 outline-none bg-white resize-none text-sm leading-relaxed" 
                        placeholder="Nội quy sẽ hiển thị ở đây. Bạn cũng có thể gõ thêm nội quy riêng..." 
                      />
                      <p className="text-[11px] text-blue-600 mt-2 italic">💡 Nội dung này sẽ tự động điền vào hợp đồng khi có khách thuê phòng này. Khách thuê có thể tìm phòng dựa trên nội quy.</p>
                    </div>
                  </div>
                )}

                {/* STEP 4: HÌNH ẢNH */}
                {roomStep === 4 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    {/* Upload Ảnh thường — dùng UploadQueueUI */}
                    <div className="border-t pt-4">
                      <UploadQueueUI
                        items={imageQueue.items}
                        onAddFiles={handleAddImages}
                        onRemove={imageQueue.removeItem}
                        onRetry={imageQueue.retryItem}
                        label="📷 Hình ảnh Phòng"
                      />
                    </div>

                    {/* Upload Ảnh 360 — dùng UploadQueueUI */}
                    <div className="border-t pt-4 mt-2">
                      <div className="mb-2">
                        <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                          🌐 Ảnh 360° (Virtual Tour)
                        </label>
                        <p className="text-xs text-gray-500">
                          Tải lên ảnh panorama 360 độ để khách thuê có thể xem phòng 3D trực tuyến. Tối đa 5 ảnh, mỗi ảnh ≤ 10MB. Ảnh 360° không bị nén.
                        </p>
                      </div>
                      <UploadQueueUI
                        items={panoQueue.items}
                        onAddFiles={handleAddPanoImages}
                        onRemove={panoQueue.removeItem}
                        onRetry={panoQueue.retryItem}
                        label="Ảnh 360°"
                      />

                      {panoQueue.items.length === 0 && (
                        <p className="text-[11px] text-cyan-600 mt-2 flex items-start gap-1 bg-cyan-50 p-2.5 rounded-md border border-cyan-100">
                          <span className="flex-shrink-0">💡</span>
                          <span><strong>Mẹo:</strong> Mở ứng dụng Camera → chế độ Panorama → quay tròn 360°. Hoặc dùng app Google Street View để chụp ảnh cầu 360 chuyên nghiệp.</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t bg-muted/40 flex justify-between gap-3 flex-shrink-0">
              {roomStep > 1 ? (
                <Button type="button" variant="outline" onClick={() => setRoomStep(roomStep - 1)} disabled={isSubmitting}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Quay lại
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)} disabled={isSubmitting} className="text-gray-500">
                  Hủy bỏ
                </Button>
              )}
              
              {roomStep < 4 ? (
                <Button type="submit" form="room-form" className="min-w-[120px] bg-primary">
                  Tiếp tục <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="room-form"
                  disabled={isSubmitting || !imageQueue.canSubmit || !panoQueue.canSubmit}
                  className="min-w-[140px] bg-green-600 hover:bg-green-700"
                  title={
                    imageQueue.isUploading || panoQueue.isUploading
                      ? 'Đang tải ảnh lên, vui lòng chờ...'
                      : imageQueue.hasError || panoQueue.hasError
                        ? 'Có ảnh lỗi. Vui lòng Thử lại hoặc Xóa trước khi lưu.'
                        : undefined
                  }
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {(imageQueue.isUploading || panoQueue.isUploading) && !isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {isSubmitting ? 'Đang lưu...' : (imageQueue.isUploading || panoQueue.isUploading) ? 'Đang tải ảnh...' : (editingId ? 'Lưu thay đổi' : 'Hoàn tất & Tạo')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIALOG XÁC NHẬN XÓA PHÒNG */}
      {deleteRoomConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-50 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Xóa phòng?</h3>
              <p className="text-sm text-gray-500 mb-1">Bạn có chắc muốn xóa phòng</p>
              <p className="font-semibold text-gray-900 mb-3">“{deleteRoomConfirm.name}”?</p>
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                ⚠️ Hành động này không thể hoàn tác. Phòng đang có hợp đồng sẽ không thể xóa.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteRoomConfirm(null)} disabled={isDeleting}>Hủy</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => {
                if (!deleteRoomConfirm) return;
                setIsDeleting(true);
                propertyApi.deleteRoom(deleteRoomConfirm.id)
                  .then(() => {
                    toast.success(`Đã xóa phòng “${deleteRoomConfirm.name}”!`);
                    setDeleteRoomConfirm(null);
                    fetchData();
                  })
                  .catch(() => {
                    toast.error('Không thể xóa phòng đang có hợp đồng hoặc lỗi hệ thống.');
                  })
                  .finally(() => setIsDeleting(false));
              }}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận xóa'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN BẢO TRÌ */}
      {showMaintenanceConfirm && pendingMaintenanceAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-3 rounded-xl ${pendingMaintenanceAction.type === 'start' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {pendingMaintenanceAction.type === 'start' ? 'Bắt đầu bảo trì?' : 'Kết thúc bảo trì?'}
                </h3>
                <p className="text-sm text-gray-500">Phòng {pendingMaintenanceAction.roomName}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600 border border-gray-100">
              {pendingMaintenanceAction.type === 'start' ? (
                <ul className="space-y-2">
                  <li className="flex gap-2"><span>•</span> <span>Phòng sẽ chuyển sang trạng thái <b>Bảo trì</b>.</span></li>
                  <li className="flex gap-2"><span>•</span> <span>Khách thuê sẽ <b>không thể</b> đặt lịch xem phòng này.</span></li>
                  <li className="flex gap-2"><span>•</span> <span>Bạn có thể kết thúc bảo trì bất cứ lúc nào.</span></li>
                </ul>
              ) : (
                <ul className="space-y-2">
                  <li className="flex gap-2"><span>•</span> <span>Phòng sẽ quay lại trạng thái <b>Sẵn sàng</b>.</span></li>
                  <li className="flex gap-2"><span>•</span> <span>Khách thuê có thể tiếp tục đặt lịch xem phòng.</span></li>
                </ul>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowMaintenanceConfirm(false)} disabled={isMaintenanceLoading}>Hủy</Button>
              <Button 
                className={`flex-1 ${pendingMaintenanceAction.type === 'start' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} text-white`}                 onClick={executeMaintenanceAction}
                disabled={isMaintenanceLoading}
              >
                {isMaintenanceLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÔNG BÁO KHÔNG THỂ BẢO TRÌ */}
      {showCannotMaintenanceModal && cannotMaintenanceRoom && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-50 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Không thể bảo trì</h3>
              <p className="text-sm text-gray-500 mb-4">
                Phòng <b>{cannotMaintenanceRoom.name}</b> hiện đang có hợp đồng còn hiệu lực hoặc yêu cầu thuê đang xử lý.
              </p>
              <div className="w-full p-3 bg-gray-50 rounded-lg text-xs text-gray-600 mb-6 text-left">
                <p>Để bảo trì phòng này, bạn cần:</p>
                <p className="mt-1">1. Kết thúc hợp đồng hiện tại (nếu có).</p>
                <p>2. Từ chối các yêu cầu thuê đang chờ duyệt.</p>
              </div>
              <Button className="w-full" onClick={() => {
                setShowCannotMaintenanceModal(false);
                setCannotMaintenanceRoom(null);
              }}>Đã hiểu</Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL XEM TRƯỚC NHẬP EXCEL --- */}
      {showExcelPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
               <div>
                  <h3 className="text-lg font-bold text-gray-900">Xem trước danh sách nhập ({excelRooms.length} phòng)</h3>
                  <p className="text-xs text-gray-500 italic">Vui lòng kiểm tra kỹ thông tin trước khi xác nhận lưu vào hệ thống.</p>
               </div>
               <button type="button" onClick={() => setShowExcelPreview(false)} className="text-gray-400 hover:text-gray-600" aria-label="Đóng"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
               {isImporting ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                     <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                     <h4 className="text-lg font-bold text-gray-900 mb-1">Đang thực hiện nhập dữ liệu...</h4>
                     <p className="text-sm text-gray-500 mb-6">Vui lòng không đóng trình duyệt lúc này.</p>
                     <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5">
                       <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${(importProgress / importTotal) * 100}%` }}></div>
                     </div>
                     <p className="mt-2 text-xs font-medium text-primary">Tiến độ: {importProgress}/{importTotal} ({Math.round((importProgress / importTotal) * 100)}%)</p>
                  </div>
               ) : (
                <>
                  {importErrors.length > 0 && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      <p className="font-bold mb-1">Có lỗi khi tải lên một số phòng:</p>
                      <ul className="list-disc pl-5 text-sm">
                        {importErrors.map((err, idx) => (
                          <li key={idx}>Phòng <strong>{err.name}</strong>: {err.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-4 py-3">Tên P.</th>
                          <th className="px-4 py-3">Giá (VNĐ)</th>
                          <th className="px-4 py-3">Diện tích</th>
                          <th className="px-4 py-3">Ảnh đã khớp</th>
                          <th className="px-4 py-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {excelRooms.map((room, idx) => {
                          const isInvalid = !room.name || !room.price || !room.area;
                          return (
                            <tr key={idx} className={isInvalid ? 'bg-red-50' : 'hover:bg-gray-50'}>
                              <td className="px-4 py-3 font-medium">{room.name || <span className="text-red-500">Thiếu</span>}</td>
                              <td className="px-4 py-3">{room.price ? room.price.toLocaleString() : <span className="text-red-500">Thiếu</span>}</td>
                              <td className="px-4 py-3">{room.area ? `${room.area}m2` : <span className="text-red-500">Thiếu</span>}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${room.imageStatus.normalCount === room.imageStatus.normalTotal ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    Thường: {room.imageStatus.normalCount}/{room.imageStatus.normalTotal}
                                  </span>
                                  {room.imageStatus.needsPano && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${room.imageStatus.hasPano ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                      360°: {room.imageStatus.hasPano ? 'Đã khớp' : 'Thiếu'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {isInvalid ? (
                                  <span className="text-xs text-red-600 font-bold bg-red-100 px-2 py-1 rounded">Lỗi dữ liệu</span>
                                ) : (
                                  <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded">Hợp lệ</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
               )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <Button disabled={isImporting} variant="outline" onClick={() => setShowExcelPreview(false)}>
                Đóng
              </Button>
              {!isImporting && (
                <Button 
                  onClick={executeExcelImport} 
                  disabled={excelRooms.length === 0}
                  className="bg-primary hover:bg-primary-dark"
                >
                  Xác nhận Nhập {excelRooms.length} phòng
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL XEM TRƯỚC NỘI DUNG AI (PREVIEW) --- */}
      {aiContentPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-purple-50 px-5 py-4 border-b border-purple-100 flex justify-between items-center flex-shrink-0">
               <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                 <Sparkles className="h-5 w-5 text-purple-600" />
                 Bản nháp từ Copilot
               </h3>
               <button type="button" onClick={() => setAiContentPreview(null)} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Đóng"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 bg-muted/40 flex-1 overflow-y-auto max-h-[60vh]">
               <div className="bg-white border rounded-xl p-5 shadow-sm text-sm leading-relaxed text-gray-800 whitespace-pre-line relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-100/50 flex flex-col items-center pointer-events-none select-none">
                     <Sparkles className="h-24 w-24 mb-2" />
                     <span className="font-black text-3xl tracking-widest uppercase">AI Generated</span>
                  </div>
                  <div className="relative z-10">{aiContentPreview}</div>
               </div>
            </div>

            <div className="p-4 border-t bg-white flex justify-between items-center">
               <Button 
                 variant="outline" 
                 onClick={handleGenerateAI}
                 disabled={isGeneratingAI}
                 className="text-purple-600 hover:bg-purple-50"
               >
                 {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2" />}
                 Thử lại văn phong khác
               </Button>
               
               <div className="flex gap-3">
                 <Button variant="ghost" onClick={() => setAiContentPreview(null)}>Hủy bỏ</Button>
                 <Button className="bg-purple-600 hover:bg-purple-700 font-bold" onClick={handleAcceptAiContent}>
                   <CheckCircle className="w-4 h-4 mr-2" />
                   Sử dụng nội dung này
                 </Button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* MODAL NHẮC NÂNG CẤP VIP */}
    <UpgradePromptModal
      isOpen={vipLimit.isOpen}
      onClose={() => setVipLimit(prev => ({ ...prev, isOpen: false }))}
      limitType={vipLimit.limitType}
      currentTier={vipLimit.currentTier}
      currentCount={vipLimit.currentCount}
      maxAllowed={vipLimit.maxAllowed}
      message={vipLimit.message}
    />
    </>
  );
}
