package iuh.se.kltn.backend.modules.ai.enums;

public enum SystemIntent {
    SEARCH_ROOM,            // Guest
    VIEW_ROOM_DETAIL,       // Guest/Tenant/Landlord
    VIEW_BILL,              // Tenant
    VIEW_DEBT,              // Tenant
    VIEW_CONTRACT,          // Tenant
    VIEW_APPOINTMENT,       // Tenant
    VIEW_REVENUE,           // Landlord
    VIEW_OCCUPANCY,         // Landlord
    VIEW_DEBTORS,           // Landlord
    VIEW_RISK,              // Landlord
    UNKNOWN                 // Fallback
}
