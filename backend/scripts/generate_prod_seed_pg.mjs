import { writeFileSync } from "node:fs";

const IMG_URL =
  "https://res.cloudinary.com/disdu197t/image/upload/v1778309856/Screenshot_2026-05-09_134328_hadbf2.png";
const NOW = new Date("2026-05-14T09:00:00");

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(42);
const randInt = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const choice = (arr) => arr[randInt(0, arr.length - 1)];

const pad2 = (n) => String(n).padStart(2, "0");
const pad = (n, w) => String(n).padStart(w, "0");

function addDays(dt, d) {
  const n = new Date(dt);
  n.setDate(n.getDate() + d);
  return n;
}
function addHours(dt, h) {
  const n = new Date(dt);
  n.setHours(n.getHours() + h);
  return n;
}
function addMinutes(dt, m) {
  const n = new Date(dt);
  n.setMinutes(n.getMinutes() + m);
  return n;
}
function fmtDate(dt) {
  if (!dt) return null;
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}
function fmtDateTime(dt) {
  if (!dt) return null;
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${pad2(
    dt.getHours()
  )}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
}

function q(v) {
  if (v === null || v === undefined) return "NULL";
  return `'${String(v).replaceAll("'", "''")}'`;
}
function qDate(v) {
  return v ? q(fmtDate(v)) : "NULL";
}
function qDateTime(v) {
  return v ? q(fmtDateTime(v)) : "NULL";
}

const admins = [
  {
    id: 1,
    username: "admin.tinh",
    full_name: "Trần Công Tỉnh",
    email: "admin.tinh@smartrental.vn",
    phone: "0901234001",
    address: "12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
  },
  {
    id: 2,
    username: "admin.ngoc",
    full_name: "Nguyễn Ngọc Mai",
    email: "admin.ngoc@smartrental.vn",
    phone: "0901234002",
    address: "88 Trần Phú, Hải Châu, TP. Đà Nẵng",
  },
];

const landlords = [
  {
    id: 3,
    username: "nminhkhang",
    full_name: "Nguyễn Minh Khang",
    email: "khang.landlord@smartrental.vn",
    phone: "0912345003",
    address: "45 Lê Văn Sỹ, Phường 13, Quận 3, TP. Hồ Chí Minh",
  },
  {
    id: 4,
    username: "tquocbao",
    full_name: "Trần Quốc Bảo",
    email: "bao.landlord@smartrental.vn",
    phone: "0912345004",
    address: "102 Hoàng Hoa Thám, Quận Ba Đình, Hà Nội",
  },
  {
    id: 5,
    username: "pgiahuy",
    full_name: "Phạm Gia Huy",
    email: "huy.landlord@smartrental.vn",
    phone: "0912345005",
    address: "211 Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh",
  },
  {
    id: 6,
    username: "lthuha",
    full_name: "Lê Thu Hà",
    email: "ha.landlord@smartrental.vn",
    phone: "0912345006",
    address: "29 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng",
  },
  {
    id: 7,
    username: "vthanhtung",
    full_name: "Võ Thanh Tùng",
    email: "tung.landlord@smartrental.vn",
    phone: "0912345007",
    address: "77 Phan Xích Long, Phú Nhuận, TP. Hồ Chí Minh",
  },
  {
    id: 8,
    username: "dngoclinh",
    full_name: "Đặng Ngọc Linh",
    email: "linh.landlord@smartrental.vn",
    phone: "0912345008",
    address: "13 Cầu Giấy, Quận Cầu Giấy, Hà Nội",
  },
  {
    id: 9,
    username: "banhdung",
    full_name: "Bùi Anh Dũng",
    email: "dung.landlord@smartrental.vn",
    phone: "0912345009",
    address: "66 Điện Biên Phủ, Quận Thanh Khê, TP. Đà Nẵng",
  },
  {
    id: 10,
    username: "hmyduyen",
    full_name: "Hồ Mỹ Duyên",
    email: "duyen.landlord@smartrental.vn",
    phone: "0912345010",
    address: "188 Lê Đức Thọ, Gò Vấp, TP. Hồ Chí Minh",
  },
];

const tenantNames = [
  "Nguyễn Văn An",
  "Trần Thị Bích",
  "Lê Hoàng Nam",
  "Phạm Quỳnh Anh",
  "Đỗ Minh Quân",
  "Vũ Thu Trang",
  "Bùi Đức Tài",
  "Hoàng Ngọc Trâm",
  "Ngô Quốc Khánh",
  "Dương Hải Yến",
  "Phan Tuấn Kiệt",
  "Lý Thanh Nhã",
  "Trương Gia Bảo",
  "Mai Khánh Linh",
  "Đinh Việt Hùng",
  "Tạ Ngọc Ánh",
  "Cao Minh Nhật",
  "La Phương Thảo",
  "Huỳnh Anh Khoa",
  "Nguyễn Thị Hảo",
  "Trần Đức Mạnh",
  "Phạm Hồng Nhung",
  "Võ Gia Bảo",
  "Lê Mỹ Tiên",
  "Nguyễn Hoài Nam",
  "Đào Thanh Huyền",
  "Phùng Đức Anh",
  "Tôn Nữ Bảo Châu",
  "Châu Gia Hân",
  "Kiều Minh Phúc",
];

const tenantAddresses = [
  "56 Nguyễn Oanh, Gò Vấp, TP. Hồ Chí Minh",
  "17 Trường Chinh, Tân Bình, TP. Hồ Chí Minh",
  "120 Láng Hạ, Đống Đa, Hà Nội",
  "15 Tố Hữu, Nam Từ Liêm, Hà Nội",
  "91 Trần Cao Vân, Hải Châu, Đà Nẵng",
  "32 Lê Quang Định, Bình Thạnh, TP. Hồ Chí Minh",
];

const users = [];
for (const a of admins) {
  users.push({ ...a, role: "ADMIN", kyc: "VERIFIED", rep: randInt(92, 99), enabled: true });
}
for (const l of landlords) {
  users.push({
    ...l,
    role: "LANDLORD",
    kyc: l.id === 8 ? "PENDING" : "VERIFIED",
    rep: randInt(78, 97),
    enabled: true,
  });
}
for (let i = 0; i < tenantNames.length; i++) {
  const uid = 11 + i;
  let kyc;
  let rep;
  if (uid <= 34) {
    kyc = "VERIFIED";
    rep = randInt(62, 94);
  } else if (uid <= 37) {
    kyc = "PENDING";
    rep = randInt(45, 70);
  } else if (uid <= 39) {
    kyc = "REJECTED";
    rep = randInt(28, 55);
  } else {
    kyc = "NONE";
    rep = randInt(35, 60);
  }
  users.push({
    id: uid,
    username: `tenant${uid}`,
    full_name: tenantNames[i],
    email: `tenant${uid}@mail.vn`,
    phone: `09${randInt(10000000, 99999999)}`,
    address: tenantAddresses[i % tenantAddresses.length],
    role: "TENANT",
    kyc,
    rep,
    enabled: kyc !== "REJECTED" ? true : choice([true, false]),
  });
}

const vipRows = [
  { id: 1, landlord_id: 3, tier: "FREE", start: null, end: null },
  { id: 2, landlord_id: 4, tier: "SILVER", start: addDays(NOW, -50), end: addDays(NOW, 40) },
  { id: 3, landlord_id: 5, tier: "GOLD", start: addDays(NOW, -120), end: addDays(NOW, 60) },
  { id: 4, landlord_id: 6, tier: "PLATINUM", start: addDays(NOW, -30), end: addDays(NOW, 335) },
  { id: 5, landlord_id: 7, tier: "SILVER", start: addDays(NOW, -90), end: addDays(NOW, -2) },
  { id: 6, landlord_id: 8, tier: "GOLD", start: addDays(NOW, -20), end: addDays(NOW, 180) },
  { id: 7, landlord_id: 9, tier: "FREE", start: null, end: null },
  { id: 8, landlord_id: 10, tier: "PLATINUM", start: addDays(NOW, -10), end: addDays(NOW, 355) },
];

const propertySpecs = [
  [1, 3, "Khu trọ An Phúc Quận 7", "17A_21 Trần Ngọc Hưng, Phường Tân Thuận Tây", "Quận 7", "TP. Hồ Chí Minh", 10.7478, 106.7219, "APPROVED", 92, null],
  [2, 3, "Chung cư mini KLTN", "12 Nguyễn Văn Bảo, Phường 4", "Gò Vấp", "TP. Hồ Chí Minh", 10.8227, 106.6894, "APPROVED", 88, null],
  [3, 4, "Nhà trọ Láng Hạ Home", "128 Láng Hạ, Thành Công", "Đống Đa", "Hà Nội", 21.0184, 105.8142, "APPROVED", 86, null],
  [4, 4, "KTX Mini Cầu Giấy", "63 Duy Tân, Dịch Vọng Hậu", "Cầu Giấy", "Hà Nội", 21.0369, 105.7825, "APPROVED", 84, null],
  [5, 5, "Phòng trọ Thủ Đức Riverside", "211 Võ Văn Ngân, Linh Chiểu", "Thủ Đức", "TP. Hồ Chí Minh", 10.8505, 106.7721, "APPROVED", 90, null],
  [6, 5, "Khu nhà ở sinh viên Bình Thạnh", "24 Ung Văn Khiêm, Phường 25", "Bình Thạnh", "TP. Hồ Chí Minh", 10.8084, 106.7138, "APPROVED", 87, null],
  [7, 6, "Danang Smart Stay", "39 Nguyễn Văn Linh, Hải Châu", "Hải Châu", "Đà Nẵng", 16.0544, 108.2022, "APPROVED", 91, null],
  [8, 6, "Phòng trọ Sơn Trà View", "81 Ngô Quyền, An Hải Bắc", "Sơn Trà", "Đà Nẵng", 16.0701, 108.234, "APPROVED", 85, null],
  [9, 7, "Phan Xích Long Studio", "74 Phan Xích Long, Phường 2", "Phú Nhuận", "TP. Hồ Chí Minh", 10.8004, 106.6832, "APPROVED", 89, null],
  [10, 8, "Ba Đình Home", "22 Liễu Giai, Cống Vị", "Ba Đình", "Hà Nội", 21.0363, 105.8148, "APPROVED", 82, null],
  [11, 9, "Thanh Khê Co-living", "102 Điện Biên Phủ, Chính Gián", "Thanh Khê", "Đà Nẵng", 16.0668, 108.1964, "APPROVED", 80, null],
  [12, 10, "Gò Vấp Green House", "188 Lê Đức Thọ, Phường 17", "Gò Vấp", "TP. Hồ Chí Minh", 10.8408, 106.6653, "PENDING", 74, null],
  [13, 8, "Khu trọ Dịch Vọng Mới", "27 Trần Thái Tông, Dịch Vọng", "Cầu Giấy", "Hà Nội", 21.0343, 105.7894, "PENDING", 72, null],
  [14, 9, "Nhà trọ Cấm Lệ Budget", "11 Tôn Đản, Hòa An", "Cẩm Lệ", "Đà Nẵng", 16.0232, 108.2174, "REJECTED", 55, "Ảnh phòng không đầy đủ, thiếu giấy tờ xác thực sở hữu."],
  [15, 10, "Minihouse Bình Chánh", "46 Trần Văn Giàu, Tân Túc", "Bình Chánh", "TP. Hồ Chí Minh", 10.6941, 106.5899, "HIDDEN", 68, "Tạm ẩn do chủ trọ yêu cầu chỉnh sửa nội dung mô tả."],
];

const roomCounts = [6, 5, 5, 4, 5, 4, 5, 5, 4, 4, 5, 4, 4, 5, 5];
const roomTypeCycle = ["STUDIO", "ONE_BEDROOM", "SINGLE_ROOM", "MEZZANINE_ROOM", "SHARED_ROOM", "TWO_BEDROOM"];

const rooms = [];
let roomId = 1;
for (let i = 0; i < propertySpecs.length; i++) {
  const [pid, _lid, pname] = propertySpecs[i];
  const cnt = roomCounts[i];
  for (let j = 0; j < cnt; j++) {
    const rtype = roomTypeCycle[(roomId - 1) % roomTypeCycle.length];
    const hasMezz = rtype === "MEZZANINE_ROOM";
    const hasBalcony = choice([true, false]);
    const basePrice = {
      SHARED_ROOM: 1800000,
      SINGLE_ROOM: 2800000,
      STUDIO: 3600000,
      MEZZANINE_ROOM: 3900000,
      ONE_BEDROOM: 4700000,
      TWO_BEDROOM: 6500000,
    }[rtype];
    const price = basePrice + j * 150000 + randInt(0, 180000);
    const area =
      {
        SHARED_ROOM: 16.0,
        SINGLE_ROOM: 20.0,
        STUDIO: 24.0,
        MEZZANINE_ROOM: 26.0,
        ONE_BEDROOM: 30.0,
        TWO_BEDROOM: 42.0,
      }[rtype] + choice([0.0, 1.5, 2.0, 3.0]);
    const maxOcc = rtype === "SHARED_ROOM" || rtype === "TWO_BEDROOM" ? 4 : 2;
    rooms.push({
      id: roomId,
      property_id: pid,
      name: `Phòng ${100 + j}`,
      price,
      area,
      max_occ: maxOcc,
      current_occ: 0,
      type: rtype,
      has_mezz: hasMezz,
      has_balcony: hasBalcony,
      status: "AVAILABLE",
      amenities: '["wifi","máy lạnh","nước nóng","khóa vân tay"]',
      default_terms: "Không hút thuốc trong phòng. Giữ yên tĩnh sau 22:00.",
      images: `["${IMG_URL}"]`,
      panorama: rnd() < 0.2 ? `["${IMG_URL}"]` : "[]",
      desc: `${pname} - phòng sạch sẽ, an ninh tốt, phù hợp sinh viên và người đi làm.`,
      approval_status: propertySpecs[pid - 1][8] === "APPROVED" ? "APPROVED" : propertySpecs[pid - 1][8],
      meta_hash: `meta_room_${pad(roomId, 3)}`,
      safety: randInt(70, 96),
      moderation_reason: null,
    });
    roomId++;
  }
}

for (const r of rooms) {
  const pstatus = propertySpecs[r.property_id - 1][8];
  if (pstatus === "REJECTED") {
    r.status = "HIDDEN";
    r.approval_status = "REJECTED";
    r.moderation_reason = "Phòng thuộc khu trọ chưa đạt duyệt nội dung.";
  } else if (pstatus === "PENDING") {
    r.status = "HIDDEN";
    r.approval_status = "PENDING";
  } else if (pstatus === "HIDDEN") {
    r.status = "HIDDEN";
    r.approval_status = "HIDDEN";
  }
}

const approvedRoomIds = rooms
  .filter((r) => propertySpecs[r.property_id - 1][8] === "APPROVED")
  .map((r) => r.id);
const activeRoomIds = approvedRoomIds.slice(0, 15);
const expiredRoomIds = approvedRoomIds.slice(15, 20);
const terminatedRoomIds = approvedRoomIds.slice(20, 22);
const awaitingRoomIds = approvedRoomIds.slice(22, 23);
const pendingRoomIds = approvedRoomIds.slice(23, 25);

const activeTenants = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 35, 36, 23];
const expiredTenants = [24, 25, 26, 27, 28];
const terminatedTenants = [29, 30];
const awaitingTenants = [37];
const pendingTenants = [38, 40];

const contracts = [];
let cid = 1;

for (let i = 0; i < activeRoomIds.length; i++) {
  const rid = activeRoomIds[i];
  const start = addDays(new Date("2025-12-01"), 30 * (i % 3));
  const sign = addHours(addDays(start, -(7 + (i % 4))), 10 + (i % 5));
  const end = addDays(new Date("2026-12-01"), 30 * (i % 2));
  const signMethod = i % 3 === 0 ? "BLOCKCHAIN" : "TRADITIONAL";
  const room = rooms.find((r) => r.id === rid);
  contracts.push({
    id: cid,
    tenant_id: activeTenants[i],
    room_id: rid,
    sign_date: sign,
    start_date: start,
    end_date: end,
    actual_price: room.price,
    deposit_amount: Math.round(room.price),
    sign_method: signMethod,
    content_url: `https://contracts.smartrental.vn/C-${pad(cid, 4)}.pdf`,
    contract_hash: signMethod === "BLOCKCHAIN" ? `0x${cid.toString(16).padStart(64, "0")}` : null,
    smart_contract_address: signMethod === "BLOCKCHAIN" ? `0x${(cid + 5000).toString(16).padStart(40, "0")}` : null,
    deploy_tx_hash: signMethod === "BLOCKCHAIN" ? `0xdeploy${String(cid).padStart(60, "0")}` : null,
    deposit_tx_hash: signMethod === "BLOCKCHAIN" ? `0xdeposit${String(cid).padStart(59, "0")}` : null,
    elec: 3800 + (cid % 3) * 100,
    water: 95000 + (cid % 4) * 5000,
    internet: 120000,
    late_penalty: 5 + (cid % 4),
    landlord_wallet: `0x${(100000 + room.property_id).toString(16).padStart(40, "0")}`,
    tenant_wallet: `0x${(200000 + activeTenants[i]).toString(16).padStart(40, "0")}`,
    status: "ACTIVE",
    cancel_reason: null,
    is_compromised: false,
    is_tenant_signed: true,
    is_landlord_signed: true,
    deposit_status: "DEPOSITED",
    additional_terms: "Không nuôi thú cưng gây ồn; thanh toán trước ngày 05 hằng tháng.",
    created_at: addHours(sign, -2),
    updated_at: addDays(NOW, -randInt(1, 20)),
    deposit_settled: true,
    deposit_settled_at: addDays(sign, 1),
    settlement_reminder_sent: choice([false, false, true]),
  });
  room.status = "RENTED";
  room.current_occ = choice([1, 1, 2]);
  cid++;
}

for (let i = 0; i < expiredRoomIds.length; i++) {
  const rid = expiredRoomIds[i];
  const start = addDays(new Date("2024-12-01"), 30 * i);
  const sign = addHours(addDays(start, -6), 9);
  const end = addDays(new Date("2025-10-31"), -15 * i);
  const bc = i % 2 === 1;
  const room = rooms.find((r) => r.id === rid);
  contracts.push({
    id: cid,
    tenant_id: expiredTenants[i],
    room_id: rid,
    sign_date: sign,
    start_date: start,
    end_date: end,
    actual_price: room.price,
    deposit_amount: Math.round(room.price),
    sign_method: bc ? "BLOCKCHAIN" : "TRADITIONAL",
    content_url: `https://contracts.smartrental.vn/C-${pad(cid, 4)}.pdf`,
    contract_hash: bc ? `0x${cid.toString(16).padStart(64, "0")}` : null,
    smart_contract_address: bc ? `0x${(cid + 5000).toString(16).padStart(40, "0")}` : null,
    deploy_tx_hash: bc ? `0xdeploy${String(cid).padStart(60, "0")}` : null,
    deposit_tx_hash: bc ? `0xdeposit${String(cid).padStart(59, "0")}` : null,
    elec: 3900,
    water: 100000,
    internet: 120000,
    late_penalty: 7,
    landlord_wallet: `0x${(100000 + room.property_id).toString(16).padStart(40, "0")}`,
    tenant_wallet: `0x${(200000 + expiredTenants[i]).toString(16).padStart(40, "0")}`,
    status: "EXPIRED",
    cancel_reason: null,
    is_compromised: false,
    is_tenant_signed: true,
    is_landlord_signed: true,
    deposit_status: "REFUNDED",
    additional_terms: "Hợp đồng đã kết thúc, hai bên hoàn tất bàn giao.",
    created_at: addHours(sign, -1),
    updated_at: addHours(end, 11),
    deposit_settled: true,
    deposit_settled_at: addDays(sign, 1),
    settlement_reminder_sent: true,
  });
  room.status = "AVAILABLE";
  room.current_occ = 0;
  cid++;
}

for (let i = 0; i < terminatedRoomIds.length; i++) {
  const rid = terminatedRoomIds[i];
  const start = addDays(new Date("2025-07-01"), 30 * i);
  const sign = addHours(addDays(start, -5), 14);
  const end = addDays(new Date("2026-02-15"), 10 * i);
  const room = rooms.find((r) => r.id === rid);
  contracts.push({
    id: cid,
    tenant_id: terminatedTenants[i],
    room_id: rid,
    sign_date: sign,
    start_date: start,
    end_date: end,
    actual_price: room.price,
    deposit_amount: Math.round(room.price * 1.2),
    sign_method: "TRADITIONAL",
    content_url: `https://contracts.smartrental.vn/C-${pad(cid, 4)}.pdf`,
    contract_hash: null,
    smart_contract_address: null,
    deploy_tx_hash: null,
    deposit_tx_hash: null,
    elec: 3900,
    water: 100000,
    internet: 120000,
    late_penalty: 8,
    landlord_wallet: `0x${(100000 + room.property_id).toString(16).padStart(40, "0")}`,
    tenant_wallet: `0x${(200000 + terminatedTenants[i]).toString(16).padStart(40, "0")}`,
    status: "TERMINATED_EARLY",
    cancel_reason: "Người thuê chuyển nơi làm việc sang tỉnh khác.",
    is_compromised: false,
    is_tenant_signed: true,
    is_landlord_signed: true,
    deposit_status: "PENALIZED",
    additional_terms: "Khấu trừ một phần cọc theo điều khoản chấm dứt sớm.",
    created_at: addHours(sign, -1),
    updated_at: addHours(end, 9),
    deposit_settled: true,
    deposit_settled_at: addDays(sign, 1),
    settlement_reminder_sent: true,
  });
  room.status = i === 0 ? "MAINTENANCE" : "AVAILABLE";
  room.current_occ = 0;
  cid++;
}

for (const rid of awaitingRoomIds) {
  const start = new Date("2026-06-01");
  const sign = new Date("2026-05-10T16:00:00");
  const room = rooms.find((r) => r.id === rid);
  contracts.push({
    id: cid,
    tenant_id: awaitingTenants[0],
    room_id: rid,
    sign_date: sign,
    start_date: start,
    end_date: new Date("2027-05-31"),
    actual_price: room.price,
    deposit_amount: Math.round(room.price),
    sign_method: "BLOCKCHAIN",
    content_url: `https://contracts.smartrental.vn/C-${pad(cid, 4)}.pdf`,
    contract_hash: `0x${cid.toString(16).padStart(64, "0")}`,
    smart_contract_address: `0x${(cid + 5000).toString(16).padStart(40, "0")}`,
    deploy_tx_hash: `0xdeploy${String(cid).padStart(60, "0")}`,
    deposit_tx_hash: null,
    elec: 4000,
    water: 105000,
    internet: 130000,
    late_penalty: 10,
    landlord_wallet: `0x${(100000 + room.property_id).toString(16).padStart(40, "0")}`,
    tenant_wallet: `0x${(200000 + awaitingTenants[0]).toString(16).padStart(40, "0")}`,
    status: "AWAITING_DEPOSIT",
    cancel_reason: null,
    is_compromised: false,
    is_tenant_signed: true,
    is_landlord_signed: true,
    deposit_status: "UNPAID",
    additional_terms: "Cần hoàn tất cọc trong vòng 48 giờ kể từ khi ký.",
    created_at: addHours(sign, -1),
    updated_at: addDays(NOW, -1),
    deposit_settled: false,
    deposit_settled_at: null,
    settlement_reminder_sent: false,
  });
  room.status = "RESERVED";
  room.current_occ = 0;
  cid++;
}

for (let i = 0; i < pendingRoomIds.length; i++) {
  const rid = pendingRoomIds[i];
  const room = rooms.find((r) => r.id === rid);
  contracts.push({
    id: cid,
    tenant_id: pendingTenants[i],
    room_id: rid,
    sign_date: null,
    start_date: addDays(new Date("2026-06-15"), i * 15),
    end_date: addDays(new Date("2027-06-14"), i * 15),
    actual_price: room.price,
    deposit_amount: Math.round(room.price),
    sign_method: i === 0 ? "TRADITIONAL" : "BLOCKCHAIN",
    content_url: `https://contracts.smartrental.vn/C-${pad(cid, 4)}.pdf`,
    contract_hash: null,
    smart_contract_address: null,
    deploy_tx_hash: null,
    deposit_tx_hash: null,
    elec: 3900,
    water: 100000,
    internet: 120000,
    late_penalty: 7,
    landlord_wallet: `0x${(100000 + room.property_id).toString(16).padStart(40, "0")}`,
    tenant_wallet: `0x${(200000 + pendingTenants[i]).toString(16).padStart(40, "0")}`,
    status: "PENDING_SIGNATURE",
    cancel_reason: null,
    is_compromised: false,
    is_tenant_signed: false,
    is_landlord_signed: false,
    deposit_status: "UNPAID",
    additional_terms: "Đang chờ hai bên xác nhận điều khoản cuối cùng.",
    created_at: addDays(NOW, -(4 + i)),
    updated_at: addDays(NOW, -1),
    deposit_settled: false,
    deposit_settled_at: null,
    settlement_reminder_sent: false,
  });
  room.status = "RESERVED";
  room.current_occ = 0;
  cid++;
}

// Traditional-only seed: disable blockchain-specific contract traces
for (const c of contracts) {
  c.sign_method = "TRADITIONAL";
  c.contract_hash = null;
  c.smart_contract_address = null;
  c.deploy_tx_hash = null;
  c.deposit_tx_hash = null;
  c.landlord_wallet = null;
  c.tenant_wallet = null;
}

const billContracts = contracts.filter((c) => c.status === "ACTIVE" || c.status === "EXPIRED");
const bills = [];
let bid = 1;
for (const c of billContracts) {
  for (let k = 0; k < 6; k++) {
    const monthDate = addDays(new Date(c.start_date), 31 * k);
    const month = monthDate.getMonth() + 1;
    const year = monthDate.getFullYear();
    const oldElec = 100 + k * 45 + (c.id % 30);
    const newElec = oldElec + randInt(35, 85);
    const oldWater = 30 + k * 9 + (c.id % 12);
    const newWater = oldWater + randInt(6, 14);
    const elecCost = (newElec - oldElec) * c.elec;
    const waterCost = (newWater - oldWater) * c.water;
    const additional = choice([0, 50000, 80000]);
    const discount = choice([0, 0, 30000, 50000]);
    const deadline = new Date(`${year}-${pad2(month)}-05T23:30:00`);
    let status;
    if (c.status === "EXPIRED") {
      status = k <= 3 || k === 5 ? "PAID" : "LATE";
    } else if (k <= 2) {
      status = "PAID";
    } else if (k === 3) {
      status = c.id % 2 === 0 ? "PAID" : "LATE";
    } else if (k === 4) {
      status = c.id % 3 ? "UNPAID" : "LATE";
    } else {
      status = "UNPAID";
    }

    let penalty = 0;
    let paidAt = null;
    let txHash = null;
    let settled = false;
    let settledAt = null;
    let note = null;
    const subtotal = c.actual_price + elecCost + waterCost + c.internet + additional - discount;
    if (status === "PAID") {
      const latePaid = k === 3 && c.id % 4 === 0;
      paidAt = latePaid ? addHours(addDays(deadline, randInt(1, 5)), 2) : addHours(addDays(deadline, -randInt(1, 3)), -1);
      if (latePaid) {
        penalty = Math.round(subtotal * 0.02);
        note = "Đã thanh toán trễ hạn";
      }
      txHash = null;
      settled = true;
      settledAt = addDays(paidAt, 1);
    } else if (status === "LATE") {
      penalty = Math.round(subtotal * 0.03);
      note = "Quá hạn chưa thanh toán";
    } else if (status === "PENDING") {
      txHash = `0xpending${String(bid).padStart(57, "0")}`;
      note = "Đang chờ xác nhận giao dịch on-chain";
    } else {
      note = "Chưa thanh toán";
    }
    bills.push({
      id: bid,
      contract_id: c.id,
      month,
      year,
      old_elec: oldElec,
      new_elec: newElec,
      old_water: oldWater,
      new_water: newWater,
      total: Math.round(subtotal + penalty),
      rate: 80000000,
      deadline,
      tx_hash: txHash,
      penalty,
      status,
      paid_at: paidAt,
      elec_img: IMG_URL,
      water_img: IMG_URL,
      additional,
      discount,
      note,
      settled,
      settled_at: settledAt,
    });
    bid++;
  }
}

const appointments = [];
let aid = 1;
for (const c of contracts) {
  const room = rooms.find((r) => r.id === c.room_id);
  const landlordId = propertySpecs[room.property_id - 1][1];
  let meet;
  let status;
  if (c.sign_date) {
    meet = addHours(addDays(c.sign_date, -randInt(2, 9)), -randInt(0, 5));
    status = ["ACTIVE", "EXPIRED", "TERMINATED_EARLY", "AWAITING_DEPOSIT"].includes(c.status)
      ? "COMPLETED"
      : "CONFIRMED";
  } else {
    meet = addHours(addDays(NOW, -randInt(1, 12)), -randInt(1, 10));
    status = aid % 2 === 0 ? "PENDING" : "CONFIRMED";
  }
  appointments.push({
    id: aid,
    tenant_id: c.tenant_id,
    landlord_id: landlordId,
    room_id: c.room_id,
    meet_time: meet,
    status,
    note: "Xem phòng và trao đổi điều khoản thuê.",
    link: status === "CONFIRMED" ? `https://meet.google.com/sr-${pad(aid, 3)}` : null,
    created_at: addDays(meet, -1),
    reminder_sent: choice([true, false]),
  });
  aid++;
}

const extraRoomIds = rooms.filter((r) => r.status === "AVAILABLE").map((r) => r.id);
for (let i = 0; i < 15; i++) {
  const rid = extraRoomIds[i % extraRoomIds.length];
  const room = rooms.find((r) => r.id === rid);
  const landlordId = propertySpecs[room.property_id - 1][1];
  const status = ["CANCELLED", "PENDING", "CONFIRMED", "CANCELLED", "PENDING"][i % 5];
  appointments.push({
    id: aid,
    tenant_id: 11 + ((i * 3) % 30),
    landlord_id: landlordId,
    room_id: rid,
    meet_time: addHours(addDays(NOW, randInt(1, 20)), randInt(8, 18)),
    status,
    note: status === "CANCELLED" ? "Khách xin dời lịch." : "Đang chờ xác nhận lịch hẹn.",
    link: status === "CONFIRMED" ? `https://meet.google.com/sr-${pad(aid, 3)}` : null,
    created_at: addDays(NOW, -randInt(0, 4)),
    reminder_sent: false,
  });
  aid++;
}

const reviews = [];
let rvid = 1;
const reviewContracts = contracts.filter((c) => ["ACTIVE", "EXPIRED", "TERMINATED_EARLY"].includes(c.status));
for (const c of reviewContracts) {
  const room = rooms.find((r) => r.id === c.room_id);
  const landlordId = propertySpecs[room.property_id - 1][1];
  let created = addHours(addDays(c.start_date, randInt(20, 150)), 10);
  if (created > NOW) created = addDays(NOW, -randInt(3, 30));
  reviews.push({
    id: rvid,
    contract_id: c.id,
    reviewer_id: c.tenant_id,
    target_id: landlordId,
    rating: choice([4, 5, 5, 3, 4]),
    comment: choice([
      "Chủ trọ phản hồi nhanh, hỗ trợ tốt khi phát sinh sự cố.",
      "Phòng đúng mô tả, an ninh ổn, khu vực thuận tiện đi lại.",
      "Giá hợp lý so với tiện ích, hợp đồng rõ ràng.",
      "Trải nghiệm ổn, cần cải thiện tốc độ xử lý bảo trì.",
    ]),
    created_at: created,
  });
  rvid++;
}
for (const c of reviewContracts.slice(0, 3)) {
  const room = rooms.find((r) => r.id === c.room_id);
  const landlordId = propertySpecs[room.property_id - 1][1];
  let created = addHours(addDays(c.start_date, randInt(50, 120)), 16);
  if (created > NOW) created = addDays(NOW, -7);
  reviews.push({
    id: rvid,
    contract_id: c.id,
    reviewer_id: landlordId,
    target_id: c.tenant_id,
    rating: choice([4, 5, 3]),
    comment: choice([
      "Khách thuê hợp tác tốt, thanh toán đúng hẹn phần lớn kỳ.",
      "Giữ gìn tài sản tốt, giao tiếp lịch sự.",
      "Có vài lần thanh toán chậm nhưng đã phối hợp xử lý.",
    ]),
    created_at: created,
  });
  rvid++;
}

const reportReasons = [
  "Nghi ngờ thông tin giá không minh bạch",
  "Ảnh phòng không đúng thực tế",
  "Chủ trọ phản hồi không phù hợp",
  "Nghi ngờ trùng lặp tin đăng",
  "Thông tin tiện ích chưa chính xác",
];
const reports = [];
for (let i = 0; i < 15; i++) {
  const status = ["PENDING", "RESOLVED_CLEAN", "RESOLVED_VIOLATING"][i % 3];
  const created = addHours(addDays(NOW, -randInt(2, 60)), -randInt(1, 18));
  let admin = null;
  if (status === "RESOLVED_CLEAN") admin = "Đã kiểm tra, nội dung báo cáo không đủ cơ sở vi phạm.";
  if (status === "RESOLVED_VIOLATING") admin = "Đã xác nhận vi phạm, yêu cầu chỉnh sửa nội dung và hình ảnh.";
  reports.push({
    id: i + 1,
    reporter_id: 11 + (i % 30),
    room_id: approvedRoomIds[(i * 2) % approvedRoomIds.length],
    reason: reportReasons[i % reportReasons.length],
    details: "Người dùng gửi báo cáo để admin kiểm tra tính minh bạch của tin đăng.",
    evidence_urls: `["${IMG_URL}"]`,
    status,
    admin_notes: admin,
    created_at: created,
    updated_at: addHours(addDays(created, randInt(0, 5)), 2),
  });
}

const notifTypes = [
  "SYSTEM",
  "PAYMENT_REMINDER",
  "CONTRACT_UPDATE",
  "NEW_REVIEW",
  "APPOINTMENT_UPDATE",
  "BILL_CREATED",
  "ROOM_AVAILABLE",
  "PROPERTY_APPROVED",
  "PROPERTY_REJECTED",
  "ROOM_APPROVED",
  "ROOM_REJECTED",
  "ROOM_UPDATED",
  "KYC_UPDATE",
];
const titleMap = {
  SYSTEM: "Thông báo hệ thống",
  PAYMENT_REMINDER: "Nhắc thanh toán hóa đơn",
  CONTRACT_UPDATE: "Cập nhật hợp đồng",
  NEW_REVIEW: "Bạn có đánh giá mới",
  APPOINTMENT_UPDATE: "Lịch hẹn được cập nhật",
  BILL_CREATED: "Hóa đơn tháng mới",
  ROOM_AVAILABLE: "Có phòng phù hợp vừa trống",
  PROPERTY_APPROVED: "Khu trọ đã được duyệt",
  PROPERTY_REJECTED: "Khu trọ bị từ chối",
  ROOM_APPROVED: "Phòng trọ đã được duyệt",
  ROOM_REJECTED: "Phòng trọ bị từ chối",
  ROOM_UPDATED: "Phòng trọ đã được cập nhật",
  KYC_UPDATE: "Trạng thái KYC thay đổi",
};
const msgMap = {
  SYSTEM: "Hệ thống đã tối ưu trải nghiệm và cập nhật một số tính năng bảo mật.",
  PAYMENT_REMINDER: "Bạn có hóa đơn gần đến hạn hoặc đã quá hạn, vui lòng kiểm tra để tránh phát sinh phí phạt.",
  CONTRACT_UPDATE: "Hợp đồng của bạn có thay đổi mới, vui lòng mở chi tiết để xác nhận.",
  NEW_REVIEW: "Tài khoản của bạn vừa nhận một đánh giá mới từ đối tác giao dịch.",
  APPOINTMENT_UPDATE: "Trạng thái lịch hẹn xem phòng đã thay đổi. Vui lòng kiểm tra thời gian gặp.",
  BILL_CREATED: "Hóa đơn kỳ mới đã được tạo, bạn có thể kiểm tra chi tiết số điện nước và tổng tiền.",
  ROOM_AVAILABLE: "Một phòng đáp ứng tiêu chí của bạn vừa chuyển sang trạng thái còn trống.",
  PROPERTY_APPROVED: "Khu trọ của bạn đã được duyệt và đang hiển thị công khai.",
  PROPERTY_REJECTED: "Khu trọ của bạn bị từ chối, vui lòng xem lý do và cập nhật hồ sơ.",
  ROOM_APPROVED: "Phòng trọ của bạn đã được duyệt hiển thị trên hệ thống.",
  ROOM_REJECTED: "Phòng trọ của bạn bị từ chối do chưa đủ thông tin xác minh.",
  ROOM_UPDATED: "Thông tin phòng đã được cập nhật theo yêu cầu kiểm duyệt.",
  KYC_UPDATE: "Trạng thái KYC đã thay đổi, vui lòng mở hồ sơ để xem chi tiết.",
};

const notifications = [];
for (let i = 0; i < 80; i++) {
  const type = notifTypes[i % notifTypes.length];
  let ref = null;
  if (type === "PAYMENT_REMINDER" || type === "BILL_CREATED") ref = 1 + (i % 120);
  else if (type === "CONTRACT_UPDATE" || type === "NEW_REVIEW") ref = 1 + (i % 25);
  else if (type === "APPOINTMENT_UPDATE") ref = 1 + (i % 40);
  else if (type === "PROPERTY_APPROVED" || type === "PROPERTY_REJECTED") ref = 1 + (i % 15);
  else if (["ROOM_APPROVED", "ROOM_REJECTED", "ROOM_UPDATED", "ROOM_AVAILABLE"].includes(type)) ref = 1 + (i % 70);

  notifications.push({
    id: i + 1,
    user_id: 1 + (i % 40),
    title: titleMap[type],
    message: msgMap[type],
    type,
    reference_id: ref,
    is_read: rnd() < 0.62,
    created_at: addMinutes(addHours(addDays(NOW, -randInt(0, 90)), -randInt(0, 23)), -randInt(0, 59)),
  });
}

const activeRoomSet = new Set(contracts.filter((c) => c.status === "ACTIVE").map((c) => c.room_id));
if (
  !rooms
    .filter((r) => activeRoomSet.has(r.id))
    .every((r) => r.status === "RENTED")
) {
  throw new Error("Active contract room status mismatch");
}
if (rooms.some((r) => r.status === "AVAILABLE" && activeRoomSet.has(r.id))) {
  throw new Error("AVAILABLE room has ACTIVE contract");
}

const lines = [];
function pushOffsetInsert({ table, columns, aliasColumns, rows, selectExprs }) {
  lines.push(`INSERT INTO ${table} (`);
  lines.push(`    ${columns.join(", ")}`);
  lines.push(")");
  lines.push("SELECT");
  lines.push(selectExprs.map((expr, idx) => `    ${expr}${idx === selectExprs.length - 1 ? "" : ","}`).join("\n"));
  lines.push("FROM (VALUES");
  lines.push(rows.join(",\n"));
  lines.push(`) AS v(${aliasColumns.join(", ")} )`);
  lines.push("CROSS JOIN __seed_offsets AS __off;");
  lines.push("");
}
function buildOffsetInsertSql({ table, columns, valuesBody, selectExprs }) {
  return [
    `INSERT INTO ${table} (`,
    `    ${columns.join(", ")}`,
    ")",
    "SELECT",
    selectExprs.map((expr, idx) => `    ${expr}${idx === selectExprs.length - 1 ? "" : ","}`).join("\n"),
    "FROM (VALUES",
    valuesBody.trim(),
    `) AS v(${columns.join(", ")} )`,
    "CROSS JOIN __seed_offsets AS __off;",
  ].join("\n");
}
function findStmtEndOutsideQuotes(sql, startIdx) {
  let inString = false;
  for (let i = startIdx; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      if (inString && sql[i + 1] === "'") {
        i++;
        continue;
      }
      inString = !inString;
      continue;
    }
    if (ch === ";" && !inString) return i;
  }
  return -1;
}
function transformLegacyInsert(sql, { table, selectExprs }) {
  const marker = `INSERT INTO ${table} (`;
  const start = sql.indexOf(marker);
  if (start < 0) return sql;
  const colsStart = sql.indexOf("(", start);
  const valuesToken = ") VALUES";
  const colsEnd = sql.indexOf(valuesToken, colsStart);
  if (colsStart < 0 || colsEnd < 0) return sql;
  const valueStart = colsEnd + valuesToken.length;
  const stmtEnd = findStmtEndOutsideQuotes(sql, valueStart);
  if (stmtEnd < 0) return sql;

  const colsRaw = sql.slice(colsStart + 1, colsEnd).replace(/\r/g, "").replace(/\n/g, " ");
  const columns = colsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const valuesBody = sql.slice(valueStart, stmtEnd).trim();
  const rebuilt = buildOffsetInsertSql({ table, columns, valuesBody, selectExprs });
  return sql.slice(0, start) + rebuilt + sql.slice(stmtEnd + 1);
}
lines.push("-- Smart Rental production-like seed dataset (Supabase/PostgreSQL)");
lines.push("-- Generated at 2026-05-14");
lines.push("-- Offset mode: id = base_id + snapshot(MAX(id)) captured once at import time");
lines.push("BEGIN;");
lines.push("");
lines.push("-- Stable offset snapshot (must be created once before any insert)");
lines.push("CREATE TEMP TABLE __seed_offsets AS");
lines.push("SELECT");
lines.push("  COALESCE((SELECT MAX(id) FROM users), 0) AS users_off,");
lines.push("  COALESCE((SELECT MAX(id) FROM vip_subscriptions), 0) AS vip_off,");
lines.push("  COALESCE((SELECT MAX(id) FROM properties), 0) AS prop_off,");
lines.push("  COALESCE((SELECT MAX(id) FROM rooms), 0) AS room_off,");
lines.push("  COALESCE((SELECT MAX(id) FROM appointments), 0) AS appt_off,");
lines.push("  COALESCE((SELECT MAX(id) FROM contracts), 0) AS contract_off,");
lines.push("  COALESCE((SELECT MAX(id) FROM bills), 0) AS bill_off,");
lines.push("  COALESCE((SELECT MAX(id) FROM reviews), 0) AS review_off,");
lines.push("  COALESCE((SELECT MAX(id) FROM room_reports), 0) AS report_off,");
lines.push("  COALESCE((SELECT MAX(id) FROM notifications), 0) AS notif_off;");
lines.push("");

lines.push("-- =====================================================");
lines.push("-- USERS (40): 2 admins, 8 landlords, 30 tenants");
lines.push("-- =====================================================");
{
  const rows = users.map((u) => {
    const uid = u.id;
    const dob = new Date(`${1989 + (uid % 10)}-${pad2((uid % 12) + 1)}-${pad2((uid % 27) + 1)}`);
    const created = addDays(NOW, -(400 - uid * 3));
    let updated = addDays(created, randInt(5, 350));
    if (updated > NOW) updated = addDays(NOW, -randInt(1, 10));
    const wallet = u.role === "ADMIN" ? null : `0x${(300000 + uid).toString(16).padStart(40, "0")}`;
    const bank = u.role === "TENANT" && uid % 4 === 0 ? null : choice(["Vietcombank", "Techcombank", "ACB", "MB Bank"]);
    const bankAcc = bank ? `${randInt(1000000000, 9999999999)}` : null;
    const bankHolder = bank ? u.full_name.toUpperCase() : null;
    const kycNote =
      u.kyc === "PENDING"
        ? "Hồ sơ đang chờ đối soát ảnh CCCD"
        : u.kyc === "REJECTED"
          ? "Ảnh CCCD mờ hoặc không trùng khớp khuôn mặt"
          : u.kyc === "NONE"
            ? "Chưa gửi hồ sơ KYC"
            : null;
    const cccd = (`0792${pad(uid, 8)}`).slice(0, 12).padEnd(12, "0");
    return `(${[
      uid,
      q(u.username),
      q("$2a$10$smartrental.seed.hash.value"),
      q(u.full_name),
      q(u.email),
      q(u.address),
      qDate(dob),
      q(u.phone),
      q(u.phone),
      q(wallet),
      q(bank),
      q(bankAcc),
      q(bankHolder),
      q(bank ? IMG_URL : null),
      q(IMG_URL),
      q(cccd),
      q(`["${IMG_URL}"]`),
      q('{"source":"seed","confidence":"high"}'),
      q(u.kyc),
      q(kycNote),
      u.rep,
      q(u.role),
      qDateTime(created),
      qDateTime(updated),
      q(IMG_URL),
      q(IMG_URL),
      u.kyc === "PENDING" || u.kyc === "REJECTED" ? 1 : 0,
      "FALSE",
      "NULL",
      "NULL",
      "NULL",
      "NULL",
      "NULL",
      u.enabled ? "TRUE" : "FALSE",
    ].join(", ")})`;
  });
  pushOffsetInsert({
    table: "users",
    columns: [
      "id",
      "username",
      "password",
      "full_name",
      "email",
      "current_address",
      "date_of_birth",
      "phone_number",
      "zalo_phone",
      "wallet_address",
      "bank_name",
      "bank_account_number",
      "bank_account_holder",
      "bank_qr_url",
      "avatar_url",
      "cccd_number",
      "cccd_images",
      "kyc_metadata",
      "kyc_status",
      "kyc_note",
      "reputation_score",
      "role",
      "created_at",
      "updated_at",
      "cccd_front_url",
      "cccd_back_url",
      "kyc_attempts",
      "is_locked",
      "locked_at",
      "lock_until",
      "lock_reason",
      "verification_code",
      "verification_expiry",
      "is_enabled",
    ],
    aliasColumns: [
      "id",
      "username",
      "password",
      "full_name",
      "email",
      "current_address",
      "date_of_birth",
      "phone_number",
      "zalo_phone",
      "wallet_address",
      "bank_name",
      "bank_account_number",
      "bank_account_holder",
      "bank_qr_url",
      "avatar_url",
      "cccd_number",
      "cccd_images",
      "kyc_metadata",
      "kyc_status",
      "kyc_note",
      "reputation_score",
      "role",
      "created_at",
      "updated_at",
      "cccd_front_url",
      "cccd_back_url",
      "kyc_attempts",
      "is_locked",
      "locked_at",
      "lock_until",
      "lock_reason",
      "verification_code",
      "verification_expiry",
      "is_enabled",
    ],
    rows,
    selectExprs: [
      "v.id + __off.users_off AS id",
      "CASE WHEN __off.users_off = 0 THEN v.username ELSE v.username || '.r' || __off.users_off::text END AS username",
      "v.password",
      "v.full_name",
      "CASE WHEN __off.users_off = 0 THEN v.email ELSE split_part(v.email, '@', 1) || '.r' || __off.users_off::text || '@' || split_part(v.email, '@', 2) END AS email",
      "v.current_address",
      "v.date_of_birth::date",
      "v.phone_number",
      "v.zalo_phone",
      "v.wallet_address",
      "v.bank_name",
      "v.bank_account_number",
      "v.bank_account_holder",
      "v.bank_qr_url",
      "v.avatar_url",
      "v.cccd_number",
      "v.cccd_images",
      "v.kyc_metadata",
      "v.kyc_status",
      "v.kyc_note",
      "v.reputation_score",
      "v.role",
      "v.created_at::timestamp",
      "v.updated_at::timestamp",
      "v.cccd_front_url",
      "v.cccd_back_url",
      "v.kyc_attempts",
      "v.is_locked",
      "v.locked_at::timestamp",
      "v.lock_until::timestamp",
      "v.lock_reason",
      "v.verification_code",
      "v.verification_expiry::timestamp",
      "v.is_enabled",
    ],
    offsets: { users_off: "users" },
  });
}

lines.push("-- Subclass tables for JOINED inheritance");
pushOffsetInsert({
  table: "admins",
  columns: ["id"],
  aliasColumns: ["id"],
  rows: ["(1)", "(2)"],
  selectExprs: ["v.id + __off.users_off AS id"],
  offsets: { users_off: "users" },
});
pushOffsetInsert({
  table: "landlords",
  columns: ["id", "business_license_url"],
  aliasColumns: ["id", "business_license_url"],
  rows: landlords.map((l) => `(${l.id}, ${q(IMG_URL)})`),
  selectExprs: ["v.id + __off.users_off AS id", "v.business_license_url"],
  offsets: { users_off: "users" },
});
pushOffsetInsert({
  table: "tenants",
  columns: ["id"],
  aliasColumns: ["id"],
  rows: Array.from({ length: 30 }, (_, i) => `(${11 + i})`),
  selectExprs: ["v.id + __off.users_off AS id"],
  offsets: { users_off: "users" },
});

lines.push("-- =====================================================");
lines.push("-- VIP SUBSCRIPTIONS (8, FREE/SILVER/GOLD/PLATINUM)");
lines.push("-- =====================================================");
pushOffsetInsert({
  table: "vip_subscriptions",
  columns: ["id", "landlord_id", "tier", "start_date", "end_date", "created_at", "updated_at"],
  aliasColumns: ["id", "landlord_id", "tier", "start_date", "end_date", "created_at", "updated_at"],
  rows: vipRows.map(
    (v) =>
      `(${v.id}, ${v.landlord_id}, ${q(v.tier)}, ${qDateTime(v.start)}, ${qDateTime(v.end)}, ${qDateTime(addDays(NOW, -randInt(5, 120)))}, ${qDateTime(addDays(NOW, -randInt(1, 20)))})`
  ),
  selectExprs: [
    "v.id + __off.vip_off AS id",
    "v.landlord_id + __off.users_off AS landlord_id",
    "v.tier",
    "v.start_date::timestamp",
    "v.end_date::timestamp",
    "v.created_at::timestamp",
    "v.updated_at::timestamp",
  ],
  offsets: { vip_off: "vip_subscriptions", users_off: "users" },
});

lines.push("-- =====================================================");
lines.push("-- PROPERTIES (15)");
lines.push("-- =====================================================");
lines.push("INSERT INTO properties (");
lines.push("    id, landlord_id, name, address, district, city, latitude, longitude, description,");
lines.push("    is_ai_generated_description, elec_price, water_price, internet_price, images,");
lines.push("    status, safety_score, moderation_reason, created_at");
lines.push(") VALUES");
lines.push(
  propertySpecs
    .map(([pid, lid, name, addr, dist, city, lat, lng, status, safety, reason]) => {
      const desc = `${name} nằm tại ${dist}, ${city}, phù hợp sinh viên và người đi làm, có khu để xe và camera an ninh.`;
      return `(${[
        pid,
        lid,
        q(name),
        q(addr),
        q(dist),
        q(city),
        lat.toFixed(6),
        lng.toFixed(6),
        q(desc),
        pid % 3 === 0 ? "TRUE" : "FALSE",
        (3600 + (pid % 5) * 100).toFixed(2),
        (90000 + (pid % 4) * 5000).toFixed(2),
        (120000 + (pid % 3) * 10000).toFixed(2),
        q(`["${IMG_URL}"]`),
        q(status),
        safety,
        q(reason),
        qDateTime(addDays(NOW, -(220 - pid * 7))),
      ].join(", ")})`;
    })
    .join(",\n") + ";"
);
lines.push("");

lines.push("-- =====================================================");
lines.push("-- ROOMS (70)");
lines.push("-- =====================================================");
lines.push("INSERT INTO rooms (");
lines.push("    id, property_id, name, price, area, max_occupants, current_occupants, type,");
lines.push("    has_mezzanine, has_balcony, status, amenities, default_terms, images, panorama_images,");
lines.push("    description, approval_status, meta_data_hash, safety_score, moderation_reason");
lines.push(") VALUES");
lines.push(
  rooms
    .map(
      (r) =>
        `(${[
          r.id,
          r.property_id,
          q(r.name),
          r.price.toFixed(2),
          r.area.toFixed(1),
          r.max_occ,
          r.current_occ,
          q(r.type),
          r.has_mezz ? "TRUE" : "FALSE",
          r.has_balcony ? "TRUE" : "FALSE",
          q(r.status),
          q(r.amenities),
          q(r.default_terms),
          q(r.images),
          q(r.panorama),
          q(r.desc),
          q(r.approval_status),
          q(r.meta_hash),
          r.safety,
          q(r.moderation_reason),
        ].join(", ")})`
    )
    .join(",\n") + ";"
);
lines.push("");

lines.push("-- =====================================================");
lines.push("-- APPOINTMENTS (40)");
lines.push("-- =====================================================");
lines.push("INSERT INTO appointments (id, tenant_id, landlord_id, room_id, meet_time, status, note, meeting_link, created_at, reminder_sent) VALUES");
lines.push(
  appointments
    .map(
      (a) =>
        `(${[
          a.id,
          a.tenant_id,
          a.landlord_id,
          a.room_id,
          qDateTime(a.meet_time),
          q(a.status),
          q(a.note),
          q(a.link),
          qDateTime(a.created_at),
          a.reminder_sent ? "TRUE" : "FALSE",
        ].join(", ")})`
    )
    .join(",\n") + ";"
);
lines.push("");

lines.push("-- =====================================================");
lines.push("-- CONTRACTS (25)");
lines.push("-- ACTIVE contracts are bound to RENTED rooms");
lines.push("-- =====================================================");
lines.push("INSERT INTO contracts (");
lines.push("    id, tenant_id, room_id, sign_date, start_date, end_date, actual_price, deposit_amount, sign_method,");
lines.push("    content_url, contract_hash, smart_contract_address, deploy_tx_hash, deposit_tx_hash,");
lines.push("    elec_price_snapshot, water_price_snapshot, internet_price_snapshot, late_penalty_percent,");
lines.push("    landlord_wallet_snapshot, tenant_wallet_snapshot, status, cancel_reason, is_compromised,");
lines.push("    is_tenant_signed, is_landlord_signed, deposit_status, additional_terms, created_at, updated_at,");
lines.push("    is_deposit_settled_to_landlord, deposit_settled_at, settlement_reminder_sent");
lines.push(") VALUES");
lines.push(
  contracts
    .map(
      (c) =>
        `(${[
          c.id,
          c.tenant_id,
          c.room_id,
          qDateTime(c.sign_date),
          qDate(c.start_date),
          qDate(c.end_date),
          c.actual_price.toFixed(2),
          c.deposit_amount.toFixed(2),
          q(c.sign_method),
          q(c.content_url),
          q(c.contract_hash),
          q(c.smart_contract_address),
          q(c.deploy_tx_hash),
          q(c.deposit_tx_hash),
          c.elec.toFixed(2),
          c.water.toFixed(2),
          c.internet.toFixed(2),
          c.late_penalty,
          q(c.landlord_wallet),
          q(c.tenant_wallet),
          q(c.status),
          q(c.cancel_reason),
          c.is_compromised ? "TRUE" : "FALSE",
          c.is_tenant_signed ? "TRUE" : "FALSE",
          c.is_landlord_signed ? "TRUE" : "FALSE",
          q(c.deposit_status),
          q(c.additional_terms),
          qDateTime(c.created_at),
          qDateTime(c.updated_at),
          c.deposit_settled ? "TRUE" : "FALSE",
          qDateTime(c.deposit_settled_at),
          c.settlement_reminder_sent ? "TRUE" : "FALSE",
        ].join(", ")})`
    )
    .join(",\n") + ";"
);
lines.push("");

lines.push("-- =====================================================");
lines.push("-- BILLS (120) - PAID/LATE/UNPAID/PENDING");
lines.push("-- =====================================================");
lines.push("INSERT INTO bills (");
lines.push("    id, contract_id, month, year, old_elec_index, new_elec_index, old_water_index, new_water_index,");
lines.push("    total_amount, exchange_rate, deadline, payment_tx_hash, penalty_fee, status, paid_at,");
lines.push("    elec_meter_image_url, water_meter_image_url, additional_fee, discount_amount, note,");
lines.push("    is_settled_to_landlord, settled_at");
lines.push(") VALUES");
lines.push(
  bills
    .map(
      (b) =>
        `(${[
          b.id,
          b.contract_id,
          b.month,
          b.year,
          b.old_elec,
          b.new_elec,
          b.old_water,
          b.new_water,
          b.total.toFixed(2),
          b.rate.toFixed(2),
          qDateTime(b.deadline),
          q(b.tx_hash),
          b.penalty.toFixed(2),
          q(b.status),
          qDateTime(b.paid_at),
          q(b.elec_img),
          q(b.water_img),
          b.additional.toFixed(2),
          b.discount.toFixed(2),
          q(b.note),
          b.settled ? "TRUE" : "FALSE",
          qDateTime(b.settled_at),
        ].join(", ")})`
    )
    .join(",\n") + ";"
);
lines.push("");

lines.push("-- =====================================================");
lines.push("-- REVIEWS (25)");
lines.push("-- =====================================================");
lines.push("INSERT INTO reviews (id, contract_id, reviewer_id, target_id, rating, comment, created_at) VALUES");
lines.push(
  reviews
    .map(
      (r) =>
        `(${[r.id, r.contract_id, r.reviewer_id, r.target_id, r.rating, q(r.comment), qDateTime(r.created_at)].join(
          ", "
        )})`
    )
    .join(",\n") + ";"
);
lines.push("");

lines.push("-- =====================================================");
lines.push("-- ROOM REPORTS (15)");
lines.push("-- =====================================================");
lines.push("INSERT INTO room_reports (id, reporter_id, room_id, reason, details, evidence_urls, status, admin_notes, created_at, updated_at) VALUES");
lines.push(
  reports
    .map(
      (r) =>
        `(${[
          r.id,
          r.reporter_id,
          r.room_id,
          q(r.reason),
          q(r.details),
          q(r.evidence_urls),
          q(r.status),
          q(r.admin_notes),
          qDateTime(r.created_at),
          qDateTime(r.updated_at),
        ].join(", ")})`
    )
    .join(",\n") + ";"
);
lines.push("");

lines.push("-- =====================================================");
lines.push("-- NOTIFICATIONS (80)");
lines.push("-- =====================================================");
lines.push("INSERT INTO notifications (id, user_id, title, message, type, reference_id, is_read, created_at) VALUES");
lines.push(
  notifications
    .map(
      (n) =>
        `(${[
          n.id,
          n.user_id,
          q(n.title),
          q(n.message),
          q(n.type),
          n.reference_id ?? "NULL",
          n.is_read ? "TRUE" : "FALSE",
          qDateTime(n.created_at),
        ].join(", ")})`
    )
    .join(",\n") + ";"
);
lines.push("");

lines.push("-- Reset sequences after explicit IDs");
for (const t of [
  "users",
  "vip_subscriptions",
  "properties",
  "rooms",
  "appointments",
  "contracts",
  "bills",
  "reviews",
  "room_reports",
  "notifications",
]) {
  lines.push(`SELECT setval(pg_get_serial_sequence('${t}','id'), COALESCE((SELECT MAX(id) FROM ${t}), 1), true);`);
}

lines.push("");
lines.push("COMMIT;");

let sqlOutput = lines.join("\n");
sqlOutput = transformLegacyInsert(sqlOutput, {
  table: "properties",
  offsets: { prop_off: "properties", users_off: "users" },
  selectExprs: [
    "v.id + __off.prop_off AS id",
    "v.landlord_id + __off.users_off AS landlord_id",
    "v.name",
    "v.address",
    "v.district",
    "v.city",
    "v.latitude",
    "v.longitude",
    "v.description",
    "v.is_ai_generated_description",
    "v.elec_price",
    "v.water_price",
    "v.internet_price",
    "v.images",
    "v.status",
    "v.safety_score",
    "v.moderation_reason",
    "v.created_at::timestamp",
  ],
});
sqlOutput = transformLegacyInsert(sqlOutput, {
  table: "rooms",
  offsets: { room_off: "rooms", prop_off: "properties" },
  selectExprs: [
    "v.id + __off.room_off AS id",
    "v.property_id + __off.prop_off AS property_id",
    "v.name",
    "v.price",
    "v.area",
    "v.max_occupants",
    "v.current_occupants",
    "v.type",
    "v.has_mezzanine",
    "v.has_balcony",
    "v.status",
    "v.amenities",
    "v.default_terms",
    "v.images",
    "v.panorama_images",
    "v.description",
    "v.approval_status",
    "v.meta_data_hash",
    "v.safety_score",
    "v.moderation_reason",
  ],
});
sqlOutput = transformLegacyInsert(sqlOutput, {
  table: "appointments",
  offsets: { appt_off: "appointments", users_off: "users", room_off: "rooms" },
  selectExprs: [
    "v.id + __off.appt_off AS id",
    "v.tenant_id + __off.users_off AS tenant_id",
    "v.landlord_id + __off.users_off AS landlord_id",
    "v.room_id + __off.room_off AS room_id",
    "v.meet_time::timestamp",
    "v.status",
    "v.note",
    "v.meeting_link",
    "v.created_at::timestamp",
    "v.reminder_sent",
  ],
});
sqlOutput = transformLegacyInsert(sqlOutput, {
  table: "contracts",
  offsets: { contract_off: "contracts", users_off: "users", room_off: "rooms" },
  selectExprs: [
    "v.id + __off.contract_off AS id",
    "v.tenant_id + __off.users_off AS tenant_id",
    "v.room_id + __off.room_off AS room_id",
    "v.sign_date::timestamp",
    "v.start_date::date",
    "v.end_date::date",
    "v.actual_price",
    "v.deposit_amount",
    "v.sign_method",
    "v.content_url",
    "v.contract_hash",
    "v.smart_contract_address",
    "v.deploy_tx_hash",
    "v.deposit_tx_hash",
    "v.elec_price_snapshot",
    "v.water_price_snapshot",
    "v.internet_price_snapshot",
    "v.late_penalty_percent",
    "v.landlord_wallet_snapshot",
    "v.tenant_wallet_snapshot",
    "v.status",
    "v.cancel_reason",
    "v.is_compromised",
    "v.is_tenant_signed",
    "v.is_landlord_signed",
    "v.deposit_status",
    "v.additional_terms",
    "v.created_at::timestamp",
    "v.updated_at::timestamp",
    "v.is_deposit_settled_to_landlord",
    "v.deposit_settled_at::timestamp",
    "v.settlement_reminder_sent",
  ],
});
sqlOutput = transformLegacyInsert(sqlOutput, {
  table: "bills",
  offsets: { bill_off: "bills", contract_off: "contracts" },
  selectExprs: [
    "v.id + __off.bill_off AS id",
    "v.contract_id + __off.contract_off AS contract_id",
    "v.month",
    "v.year",
    "v.old_elec_index",
    "v.new_elec_index",
    "v.old_water_index",
    "v.new_water_index",
    "v.total_amount",
    "v.exchange_rate",
    "v.deadline::timestamp",
    "v.payment_tx_hash",
    "v.penalty_fee",
    "v.status",
    "v.paid_at::timestamp",
    "v.elec_meter_image_url",
    "v.water_meter_image_url",
    "v.additional_fee",
    "v.discount_amount",
    "v.note",
    "v.is_settled_to_landlord",
    "v.settled_at::timestamp",
  ],
});
sqlOutput = transformLegacyInsert(sqlOutput, {
  table: "reviews",
  offsets: { review_off: "reviews", contract_off: "contracts", users_off: "users" },
  selectExprs: [
    "v.id + __off.review_off AS id",
    "v.contract_id + __off.contract_off AS contract_id",
    "v.reviewer_id + __off.users_off AS reviewer_id",
    "v.target_id + __off.users_off AS target_id",
    "v.rating",
    "v.comment",
    "v.created_at::timestamp",
  ],
});
sqlOutput = transformLegacyInsert(sqlOutput, {
  table: "room_reports",
  offsets: { report_off: "room_reports", users_off: "users", room_off: "rooms" },
  selectExprs: [
    "v.id + __off.report_off AS id",
    "v.reporter_id + __off.users_off AS reporter_id",
    "v.room_id + __off.room_off AS room_id",
    "v.reason",
    "v.details",
    "v.evidence_urls::json",
    "v.status",
    "v.admin_notes",
    "v.created_at::timestamp",
    "v.updated_at::timestamp",
  ],
});
sqlOutput = transformLegacyInsert(sqlOutput, {
  table: "notifications",
  offsets: {
    notif_off: "notifications",
    users_off: "users",
    bill_off: "bills",
    contract_off: "contracts",
    appt_off: "appointments",
    prop_off: "properties",
    room_off: "rooms",
  },
  selectExprs: [
    "v.id + __off.notif_off AS id",
    "v.user_id + __off.users_off AS user_id",
    "v.title",
    "v.message",
    "v.type",
    `CASE
      WHEN v.reference_id IS NULL THEN NULL
      WHEN v.type IN ('PAYMENT_REMINDER', 'BILL_CREATED') THEN v.reference_id + __off.bill_off
      WHEN v.type IN ('CONTRACT_UPDATE', 'NEW_REVIEW') THEN v.reference_id + __off.contract_off
      WHEN v.type = 'APPOINTMENT_UPDATE' THEN v.reference_id + __off.appt_off
      WHEN v.type IN ('PROPERTY_APPROVED', 'PROPERTY_REJECTED') THEN v.reference_id + __off.prop_off
      WHEN v.type IN ('ROOM_AVAILABLE', 'ROOM_APPROVED', 'ROOM_REJECTED', 'ROOM_UPDATED') THEN v.reference_id + __off.room_off
      ELSE v.reference_id
    END AS reference_id`,
    "v.is_read",
    "v.created_at::timestamp",
  ],
});

writeFileSync("backend/src/main/resources/data/seed_production_smartrental_pg.sql", sqlOutput, "utf8");

console.log("Generated backend/src/main/resources/data/seed_production_smartrental_pg.sql");
console.log(
  JSON.stringify(
    {
      admins: 2,
      landlords: 8,
      tenants: 30,
      properties: propertySpecs.length,
      rooms: rooms.length,
      contracts: contracts.length,
      bills: bills.length,
      appointments: appointments.length,
      reviews: reviews.length,
      room_reports: reports.length,
      notifications: notifications.length,
      vip_subscriptions: vipRows.length,
    },
    null,
    2
  )
);
