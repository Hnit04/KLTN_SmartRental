package iuh.se.kltn.backend.modules.ai.service;

import iuh.se.kltn.backend.modules.ai.dto.request.AiPageContext;
import iuh.se.kltn.backend.modules.contract.entity.Bill;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.repository.BillRepository;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.property.enums.PropertyStatus;
import iuh.se.kltn.backend.modules.property.repository.PropertyRepository;
import iuh.se.kltn.backend.modules.property.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class AiContextValidator {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private BillRepository billRepository;

    private static final List<String> VALID_PAGE_TYPES = Arrays.asList(
            "ROOM_DETAIL", "PROPERTY_DETAIL", "TENANT_CONTRACT_DETAIL",
            "TENANT_BILL_DETAIL", "LANDLORD_PROPERTY_DETAIL", "LANDLORD_ROOM_DETAIL",
            "TENANT_CONTRACT_CREATE"
    );

    private static final List<String> VALID_ENTITY_TYPES = Arrays.asList(
            "ROOM", "PROPERTY", "CONTRACT", "BILL"
    );

    public AiPageContext validateAndResolve(AiPageContext context, String role, Long userId) {
        if (context == null || context.getEntityType() == null || context.getEntityId() == null) {
            return null;
        }

        if (!VALID_PAGE_TYPES.contains(context.getPageType()) || !VALID_ENTITY_TYPES.contains(context.getEntityType())) {
            return null; // Invalid type, strip context
        }

        if (context.getEntityId() <= 0) {
            return null; // Invalid ID
        }

        String entityType = context.getEntityType();
        Long entityId = context.getEntityId();

        try {
            if ("ADMIN".equalsIgnoreCase(role)) {
                return context; // Admin has broad access
            }

            if ("ROOM".equals(entityType)) {
                Room room = roomRepository.findById(entityId).orElse(null);
                if (room == null) return null;

                if ("GUEST".equalsIgnoreCase(role)) {
                    if (room.getApprovalStatus() != PropertyStatus.APPROVED) return null;
                } else if ("LANDLORD".equalsIgnoreCase(role)) {
                    if (!room.getProperty().getLandlord().getId().equals(userId)) return null;
                } else if ("TENANT".equalsIgnoreCase(role)) {
                    // Tenants can view public rooms, so act as GUEST for context
                    if (room.getApprovalStatus() != PropertyStatus.APPROVED) return null;
                }
            } else if ("PROPERTY".equals(entityType)) {
                Property property = propertyRepository.findById(entityId).orElse(null);
                if (property == null) return null;

                if ("GUEST".equalsIgnoreCase(role)) {
                    if (property.getStatus() != PropertyStatus.APPROVED) return null;
                } else if ("LANDLORD".equalsIgnoreCase(role)) {
                    if (!property.getLandlord().getId().equals(userId)) return null;
                } else if ("TENANT".equalsIgnoreCase(role)) {
                    // Tenants can view public properties, so act as GUEST for context
                    if (property.getStatus() != PropertyStatus.APPROVED) return null;
                }
            } else if ("CONTRACT".equals(entityType)) {
                if ("GUEST".equalsIgnoreCase(role)) return null;

                Contract contract = contractRepository.findById(entityId).orElse(null);
                if (contract == null) return null;

                if ("TENANT".equalsIgnoreCase(role)) {
                    if (!contract.getTenant().getId().equals(userId)) return null;
                } else if ("LANDLORD".equalsIgnoreCase(role)) {
                    if (!contract.getRoom().getProperty().getLandlord().getId().equals(userId)) return null;
                }
            } else if ("BILL".equals(entityType)) {
                if ("GUEST".equalsIgnoreCase(role)) return null;

                Bill bill = billRepository.findById(entityId).orElse(null);
                if (bill == null) return null;

                if ("TENANT".equalsIgnoreCase(role)) {
                    if (!bill.getContract().getTenant().getId().equals(userId)) return null;
                } else if ("LANDLORD".equalsIgnoreCase(role)) {
                    if (!bill.getContract().getRoom().getProperty().getLandlord().getId().equals(userId)) return null;
                }
            } else {
                return null;
            }

            return context; // Validated successfully
        } catch (Exception e) {
            System.err.println("[AiContextValidator] Error validating context: " + e.getMessage());
            return null;
        }
    }
}
