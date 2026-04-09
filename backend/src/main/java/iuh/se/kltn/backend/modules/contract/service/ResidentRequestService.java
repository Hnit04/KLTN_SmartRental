package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.dto.response.ContractMemberResponse;
import iuh.se.kltn.backend.modules.contract.dto.response.ResidentRequestResponse;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.entity.ContractMember;
import iuh.se.kltn.backend.modules.contract.entity.ResidentRequest;
import iuh.se.kltn.backend.modules.contract.enums.ContractStatus;
import iuh.se.kltn.backend.modules.contract.enums.RequestStatus;
import iuh.se.kltn.backend.modules.contract.repository.ContractMemberRepository;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.contract.repository.ResidentRequestRepository;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.interaction.service.NotificationService;
import iuh.se.kltn.backend.modules.interaction.enums.NotificationType;
import iuh.se.kltn.backend.common.enums.Role;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ResidentRequestService {
    @Autowired private ResidentRequestRepository residentRequestRepository;
    @Autowired private ContractRepository contractRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ContractMemberRepository contractMemberRepository;
    @Autowired private ModelMapper modelMapper;
    @Autowired private NotificationService notificationService;

    @Transactional
    public ResidentRequestResponse createRequest(Long contractId, Long requesterId, String inviteeEmail, String message) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        // 1. Kiểm tra quyền (chỉ chủ hợp đồng mới được mời)
        if (!contract.getTenant().getId().equals(requesterId)) {
            throw new RuntimeException("Chỉ chủ hợp đồng mới có quyền mời người ở cùng");
        }

        // 2. Tìm người được mời
        User invitee = userRepository.findByEmail(inviteeEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với email: " + inviteeEmail));
        
        if (invitee.getRole() != Role.TENANT) {
            throw new RuntimeException("Chỉ có thể mời người dùng có vai trò Khách thuê");
        }

        // 3. Kiểm tra xem người này có đang ở chính phòng này không
        if (invitee.getId().equals(requesterId)) {
            throw new RuntimeException("Bạn không thể mời chính mình!");
        }

        // 4. Kiểm tra sức chứa (maxOccupants)
        long currentCount = contractMemberRepository.countByContractIdAndLeftDateIsNull(contractId) + 1; // +1 là chủ hợp đồng
        Integer maxOccupants = contract.getRoom().getMaxOccupants();
        if (maxOccupants != null && currentCount >= maxOccupants) {
            throw new RuntimeException("Phòng đã đạt sức chứa tối đa (" + maxOccupants + " người)");
        }

        // 5. Kiểm tra ràng buộc 1-người-1-phòng (Sử dụng repository method đã tạo ở task trước)
        List<Contract> existingContracts = contractRepository.findByTenantIdAndStatusIn(
            invitee.getId(), Arrays.asList(ContractStatus.ACTIVE, ContractStatus.PENDING_SIGNATURE)
        );
        if (!existingContracts.isEmpty()) {
            throw new RuntimeException("Người này hiện đang có hợp đồng thuê phòng khác.");
        }

        // 6. Kiểm tra xem đã là thành viên của phòng này chưa
        if (contractMemberRepository.existsByContractIdAndUserIdAndLeftDateIsNull(contractId, invitee.getId())) {
            throw new RuntimeException("Người này đã là thành viên của phòng này.");
        }

        // 7. Kiểm tra trùng lặp yêu cầu PENDING
        if (residentRequestRepository.existsByContractIdAndInviteeIdAndStatus(contractId, invitee.getId(), RequestStatus.PENDING)) {
            throw new RuntimeException("Đã có yêu cầu đang chờ phê duyệt cho người dùng này.");
        }

        ResidentRequest request = new ResidentRequest();
        request.setContract(contract);
        request.setRequester(userRepository.findById(requesterId).get());
        request.setInvitee(invitee);
        request.setMessage(message);
        request.setStatus(RequestStatus.PENDING);

        request.setRequestType(iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD);
        request.setStatus(RequestStatus.PENDING);

        ResidentRequest savedFinal = residentRequestRepository.save(request);

        // ✅ THÊM THÔNG BÁO CHO CHỦ TRỌ
        User landlord = contract.getRoom().getProperty().getLandlord();
        notificationService.createNotification(
            landlord,
            "Yêu cầu thêm người ở cùng mới",
            "Khách thuê " + request.getRequester().getFullName() + " đã đề xuất thêm " + invitee.getFullName() + " vào ở tại phòng " + contract.getRoom().getName(),
            NotificationType.CONTRACT_UPDATE,
            contract.getId()
        );

        return mapToResponse(savedFinal);
    }

    @Transactional
    public ResidentRequestResponse createRemoveRequest(Long contractId, Long requesterId, Long memberUserId, String message) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));

        // 1. Kiểm tra quyền (chỉ chủ hợp đồng mới được xóa)
        if (!contract.getTenant().getId().equals(requesterId)) {
            throw new RuntimeException("Chỉ chủ hợp đồng mới có quyền xóa người ở cùng");
        }

        // 2. Tìm thành viên cần xóa
        User invitee = userRepository.findById(memberUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng cần xóa"));

        // 3. Kiểm tra xem có phải là thành viên hiện tại (đang ở) của phòng này không
        if (!contractMemberRepository.existsByContractIdAndUserIdAndLeftDateIsNull(contractId, invitee.getId())) {
             throw new RuntimeException("Người này hiện không phải là thành viên đang ở của phòng này.");
        }

        // 4. Kiểm tra xem đã có yêu cầu REMOVE đang PENDING chưa
        if (residentRequestRepository.existsByContractIdAndInviteeIdAndRequestTypeAndStatus(
                contractId, invitee.getId(), 
                iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.REMOVE, 
                RequestStatus.PENDING)) {
            throw new RuntimeException("Đã có yêu cầu xóa đang chờ phê duyệt cho người dùng này.");
        }

        ResidentRequest request = new ResidentRequest();
        request.setContract(contract);
        request.setRequester(userRepository.findById(requesterId).get());
        request.setInvitee(invitee);
        request.setMessage(message);
        request.setRequestType(iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.REMOVE);
        request.setStatus(RequestStatus.PENDING);

        ResidentRequest saved = residentRequestRepository.save(request);

        // ✅ THÔNG BÁO CHO CHỦ TRỌ
        User landlord = contract.getRoom().getProperty().getLandlord();
        notificationService.createNotification(
            landlord,
            "Yêu cầu xóa người ở cùng",
            "Khách thuê " + request.getRequester().getFullName() + " yêu cầu xóa " + invitee.getFullName() + " khỏi phòng " + contract.getRoom().getName(),
            NotificationType.CONTRACT_UPDATE,
            contract.getId()
        );

        return mapToResponse(saved);
    }

    public List<ResidentRequestResponse> getRequestsByContract(Long contractId) {
        return residentRequestRepository.findByContractId(contractId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ResidentRequestResponse updateStatus(Long requestId, RequestStatus status) {
        ResidentRequest residentRequest = residentRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Yêu cầu không tồn tại"));

        if (residentRequest.getStatus() != RequestStatus.PENDING) {
            throw new RuntimeException("Yêu cầu này đã được xử lý trước đó");
        }

        residentRequest.setStatus(status);
        
        // Nếu DUYỆT -> Xử lý tùy theo loại yêu cầu
        if (status == RequestStatus.APPROVED) {
            if (residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD) {
                ContractMember member = new ContractMember();
                member.setContract(residentRequest.getContract());
                member.setUser(residentRequest.getInvitee());
                member.setJoinedDate(LocalDate.now());
                contractMemberRepository.save(member);
            } else if (residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.REMOVE) {
                // TÌM THÀNH VIÊN ĐANG Ở VÀ SET leftDate
                contractMemberRepository.findByContractIdAndLeftDateIsNull(residentRequest.getContract().getId()).stream()
                    .filter(m -> m.getUser().getId().equals(residentRequest.getInvitee().getId()))
                    .findFirst()
                    .ifPresent(m -> {
                        m.setLeftDate(LocalDate.now());
                        contractMemberRepository.save(m);
                    });
            }
        }

        ResidentRequest updated = residentRequestRepository.save(residentRequest);

        String title = status == RequestStatus.APPROVED 
            ? (residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD ? "Yêu cầu thêm người được DUYỆT" : "Yêu cầu xóa người được DUYỆT")
            : (residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD ? "Yêu cầu thêm người bị TỪ CHỐI" : "Yêu cầu xóa người bị TỪ CHỐI");
        
        String message = "";
        if (status == RequestStatus.APPROVED) {
            message = residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD
                ? "Chủ trọ đã đồng ý cho " + residentRequest.getInvitee().getFullName() + " vào ở cùng bạn."
                : "Chủ trọ đã đồng ý xóa " + residentRequest.getInvitee().getFullName() + " khỏi phòng của bạn.";
        } else {
            message = residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD
                ? "Chủ trọ đã từ chối đề xuất thêm người " + residentRequest.getInvitee().getFullName() + "."
                : "Chủ trọ đã từ chối yêu cầu xóa người " + residentRequest.getInvitee().getFullName() + ".";
        }
        
        notificationService.createNotification(
            residentRequest.getRequester(),
            title,
            message,
            NotificationType.CONTRACT_UPDATE,
            residentRequest.getContract().getId()
        );

        return mapToResponse(updated);
    }

    public List<ContractMemberResponse> getMembersByContract(Long contractId) {
        return contractMemberRepository.findByContractIdAndLeftDateIsNull(contractId).stream()
                .map(this::mapToMemberResponse)
                .collect(Collectors.toList());
    }

    private ContractMemberResponse mapToMemberResponse(ContractMember member) {
        ContractMemberResponse res = new ContractMemberResponse();
        res.setId(member.getId());
        User user = member.getUser();
        if (user != null) {
            res.setUserId(user.getId());
            res.setFullName(user.getFullName());
            res.setEmail(user.getEmail());
            res.setAvatarUrl(user.getAvatarUrl());
            res.setReputationScore(user.getReputationScore());
        }
        res.setJoinedDate(member.getJoinedDate());
        return res;
    }

    private ResidentRequestResponse mapToResponse(ResidentRequest request) {
        ResidentRequestResponse res = new ResidentRequestResponse();
        res.setId(request.getId());
        res.setContractId(request.getContract().getId());
        res.setStatus(request.getStatus().name());
        res.setType(request.getRequestType() != null ? request.getRequestType().name() : "ADD");
        res.setMessage(request.getMessage());
        res.setCreatedAt(request.getCreatedAt());

        User invitee = request.getInvitee();
        res.setInviteeId(invitee.getId());
        res.setInviteeName(invitee.getFullName());
        res.setInviteeEmail(invitee.getEmail());
        res.setInviteePhone(invitee.getPhoneNumber());
        res.setInviteeZaloPhone(invitee.getZaloPhone());
        res.setInviteeAvatar(invitee.getAvatarUrl());
        res.setInviteeReputationScore(invitee.getReputationScore());
        res.setInviteeKycStatus(invitee.getKycStatus() != null ? invitee.getKycStatus().name() : "PENDING");
        res.setInviteeCurrentAddress(invitee.getCurrentAddress());
        res.setInviteeDateOfBirth(invitee.getDateOfBirth());

        User requester = request.getRequester();
        res.setRequesterId(requester.getId());
        res.setRequesterName(requester.getFullName());
        
        return res;
    }
}