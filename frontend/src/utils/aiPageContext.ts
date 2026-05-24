export interface AiPageContext {
  path: string;
  pageType: string;
  entityType: string | null;
  entityId: number | null;
}

export function buildAiPageContext(pathname: string): AiPageContext | undefined {
  // Bỏ query string nếu có
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '');
  
  if (!cleanPath || cleanPath === '/') return undefined;

  // Hỗ trợ route MVP:
  // /rooms/:id
  const roomMatch = cleanPath.match(/^\/rooms\/(\d+)$/);
  if (roomMatch) {
    return {
      path: cleanPath,
      pageType: "ROOM_DETAIL",
      entityType: "ROOM",
      entityId: parseInt(roomMatch[1], 10)
    };
  }

  // /properties/:id
  const propertyMatch = cleanPath.match(/^\/properties\/(\d+)$/);
  if (propertyMatch) {
    return {
      path: cleanPath,
      pageType: "PROPERTY_DETAIL",
      entityType: "PROPERTY",
      entityId: parseInt(propertyMatch[1], 10)
    };
  }

  // /tenant/contracts/:id
  const tenantContractMatch = cleanPath.match(/^\/tenant\/contracts\/(\d+)$/);
  if (tenantContractMatch) {
    return {
      path: cleanPath,
      pageType: "TENANT_CONTRACT_DETAIL",
      entityType: "CONTRACT",
      entityId: parseInt(tenantContractMatch[1], 10)
    };
  }

  // /tenant/bills/:id
  const tenantBillMatch = cleanPath.match(/^\/tenant\/bills\/(\d+)$/);
  if (tenantBillMatch) {
    return {
      path: cleanPath,
      pageType: "TENANT_BILL_DETAIL",
      entityType: "BILL",
      entityId: parseInt(tenantBillMatch[1], 10)
    };
  }

  // /landlord/properties/:id
  const landlordPropertyMatch = cleanPath.match(/^\/landlord\/properties\/(\d+)$/);
  if (landlordPropertyMatch) {
    return {
      path: cleanPath,
      pageType: "LANDLORD_PROPERTY_DETAIL",
      entityType: "PROPERTY",
      entityId: parseInt(landlordPropertyMatch[1], 10)
    };
  }

  // /landlord/rooms/:id
  const landlordRoomMatch = cleanPath.match(/^\/landlord\/rooms\/(\d+)$/);
  if (landlordRoomMatch) {
    return {
      path: cleanPath,
      pageType: "LANDLORD_ROOM_DETAIL",
      entityType: "ROOM",
      entityId: parseInt(landlordRoomMatch[1], 10)
    };
  }

  return undefined;
}
