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

        // ✅ THÔNG BÁO CHO NGƯỜI ĐƯỢC MỜI (INVITEE)
        notificationService.createNotification(
            invitee,
            "Lời mời vào ở cùng phòng",
            request.getRequester().getFullName() + " đã mời bạn vào ở cùng tại phòng " + contract.getRoom().getName() + ". Vui lòng xác nhận lời mời.",
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
        User requester = userRepository.findById(requesterId).get();
        request.setRequester(requester);
        request.setInvitee(invitee);
        request.setMessage(message);
        request.setRequestType(iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.REMOVE);
        request.setStatus(RequestStatus.PENDING);

        ResidentRequest saved = residentRequestRepository.save(request);

        // ✅ THÔNG BÁO CHO NGƯỜI BỊ XÓA (Để xác nhận rời đi)
        notificationService.createNotification(
            invitee,
            "Yêu cầu rời khỏi phòng",
            java.text.MessageFormat.format("Bạn vừa nhận được yêu cầu rời khỏi phòng {0} từ {1}. Vui lòng xác nhận để hoàn tất thủ tục.", 
                contract.getRoom().getName(), requester.getFullName()),
            NotificationType.CONTRACT_UPDATE,
            contract.getId()
        );

        // ✅ THÔNG BÁO CHO CHỦ TRỌ (Để đồng bộ real-time trạng thái PENDING)
        User landlord = contract.getRoom().getProperty().getLandlord();
        if (!landlord.getId().equals(requester.getId())) {
            notificationService.createNotification(
                landlord,
                "Yêu cầu xóa thành viên mới",
                "Khách thuê " + requester.getFullName() + " yêu cầu xóa " + invitee.getFullName() + " khỏi phòng " + contract.getRoom().getName(),
                NotificationType.CONTRACT_UPDATE,
                contract.getId()
            );
        }

        return mapToResponse(saved);
    }

    public List<ResidentRequestResponse> getRequestsByContract(Long contractId) {
        return residentRequestRepository.findByContractId(contractId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ResidentRequestResponse> getRequestsByInvitee(Long inviteeId) {
        return residentRequestRepository.findByInviteeId(inviteeId).stream()
                .filter(r -> r.getStatus() == RequestStatus.PENDING)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ResidentRequestResponse updateStatus(Long requestId, RequestStatus status, Long userId) {
        ResidentRequest residentRequest = residentRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Yêu cầu không tồn tại"));

        if (residentRequest.getStatus() == RequestStatus.APPROVED || residentRequest.getStatus() == RequestStatus.REJECTED) {
            throw new RuntimeException("Yêu cầu này đã được xử lý xong");
        }

        User landlord = residentRequest.getContract().getRoom().getProperty().getLandlord();
        User invitee = residentRequest.getInvitee();
        User requester = residentRequest.getRequester();
        
        String title = "";
        String msg = "";

        // 1. XỬ LÝ CHẤP NHẬN TỪ NGƯỜI ĐƯỢC MỜI (INVITEE)
        if (status == RequestStatus.ACCEPTED) {
            if (!invitee.getId().equals(userId)) {
                throw new RuntimeException("Chỉ người được mời mới có quyền chấp nhận lời mời.");
            }
            residentRequest.setStatus(RequestStatus.ACCEPTED);
            
            // ✅ THÔNG BÁO CHO CHỦ TRỌ (Để chủ trọ phê duyệt)
            notificationService.createNotification(
                landlord,
                residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD 
                    ? "Yêu cầu thêm người mới: Chờ phê duyệt" 
                    : "Yêu cầu xóa thành viên: Chờ phê duyệt",
                residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD
                    ? "Người dùng " + invitee.getFullName() + " đã đồng ý gia nhập phòng " + residentRequest.getContract().getRoom().getName() + ". Vui lòng phê duyệt để hoàn tất."
                    : "Người dùng " + invitee.getFullName() + " đã xác nhận yêu cầu rời phòng " + residentRequest.getContract().getRoom().getName() + ". Vui lòng phê duyệt để hoàn tất.",
                NotificationType.CONTRACT_UPDATE,
                residentRequest.getContract().getId()
            );

            // ✅ THÔNG BÁO CHO NGƯỜI GỬI (Để đồng bộ real-time trạng thái ACCEPTED)
            if (!requester.getId().equals(invitee.getId()) && !requester.getId().equals(landlord.getId())) {
                 notificationService.createNotification(
                    requester,
                    residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD
                        ? "Người ở cùng đã đồng ý"
                        : "Thành viên đã xác nhận rời đi",
                     residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD
                        ? invitee.getFullName() + " đã chấp nhận lời mời của bạn. Đang chờ chủ trọ phê duyệt cuối cùng."
                        : invitee.getFullName() + " đã xác nhận yêu cầu rời đi của bạn. Đang chờ chủ trọ phê duyệt cuối cùng.",
                    NotificationType.CONTRACT_UPDATE,
                    residentRequest.getContract().getId()
                );
            }
        } 
        // 2. XỬ LÝ PHÊ DUYỆT TỪ CHỦ TRỌ (LANDLORD)
        else if (status == RequestStatus.APPROVED) {
            if (!landlord.getId().equals(userId)) {
                throw new RuntimeException("Chỉ chủ trọ mới có quyền phê duyệt yêu cầu.");
            }
            // ✅ TẤT CẢ yêu cầu (ADD & REMOVE) đều phải qua bước ACCEPTED mới được APPROVED
            if (residentRequest.getStatus() != RequestStatus.ACCEPTED) {
                if (residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD) {
                    throw new RuntimeException("Người được mời chưa xác nhận lời mời.");
                } else {
                    throw new RuntimeException("Thành viên bị xóa chưa xác nhận yêu cầu rời phòng.");
                }
            }

            residentRequest.setStatus(RequestStatus.APPROVED);
            
            if (residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD) {
                ContractMember member = new ContractMember();
                member.setContract(residentRequest.getContract());
                member.setUser(invitee);
                member.setJoinedDate(LocalDate.now());
                contractMemberRepository.save(member);
            } else if (residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.REMOVE) {
                contractMemberRepository.findByContractIdAndLeftDateIsNull(residentRequest.getContract().getId()).stream()
                    .filter(m -> m.getUser().getId().equals(invitee.getId()))
                    .findFirst()
                    .ifPresent(m -> {
                        m.setLeftDate(LocalDate.now());
                        contractMemberRepository.save(m);
                    });
            }

            // ✅ THÔNG BÁO CHO NGƯỜI GỬI (A)
            title = "Yêu cầu đã được phê duyệt";
            msg = residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD
                ? "Chủ trọ đã phê duyệt cho " + invitee.getFullName() + " vào ở cùng bạn."
                : "Chủ trọ đã phê duyệt yêu cầu xóa " + invitee.getFullName() + " khỏi phòng của bạn.";

            // ✅ THÔNG BÁO CHO NGƯỜI ĐƯỢC MỜI (B)
            notificationService.createNotification(
                invitee,
                residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD
                    ? "Đã chính thức vào phòng"
                    : "Đã chính thức rời phòng",
                residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD
                    ? "Chủ trọ đã phê duyệt yêu cầu. Bạn hiện đã là thành viên của phòng " + residentRequest.getContract().getRoom().getName()
                    : "Chủ trọ đã phê duyệt yêu cầu. Bạn đã không còn là thành viên của phòng " + residentRequest.getContract().getRoom().getName(),
                NotificationType.CONTRACT_UPDATE,
                residentRequest.getContract().getId()
            );

            // ✅ THÔNG BÁO CHO CHỦ TRỌ (Để đồng bộ real-time nhiều phiên đăng nhập)
            notificationService.createNotification(
                landlord,
                "Phê duyệt thành công",
                "Bạn đã phê duyệt yêu cầu thay đổi thành viên cho phòng " + residentRequest.getContract().getRoom().getName(),
                NotificationType.CONTRACT_UPDATE,
                residentRequest.getContract().getId()
            );
        }
        // 3. XỬ LÝ TỪ CHỐI
        else if (status == RequestStatus.REJECTED) {
            residentRequest.setStatus(RequestStatus.REJECTED);
            
            if (userId.equals(invitee.getId())) {
                title = residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD
                    ? "Người ở cùng đã từ chối"
                    : "Thành viên từ chối rời đi";
                msg = residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD
                    ? invitee.getFullName() + " đã từ chối lời mời vào ở cùng bạn."
                    : invitee.getFullName() + " không đồng ý với yêu cầu rời khỏi phòng.";

                // Thông báo cho chủ trọ để đồng bộ UI
                notificationService.createNotification(
                    landlord,
                    "Yêu cầu bị từ chối",
                    invitee.getFullName() + " đã từ chối yêu cầu " + (residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD ? "vào ở" : "rời phòng"),
                    NotificationType.CONTRACT_UPDATE,
                    residentRequest.getContract().getId()
                );
            } else if (userId.equals(landlord.getId())) {
                title = "Chủ trọ đã từ chối";
                msg = "Chủ trọ đã từ chối yêu cầu " + (residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD ? "thêm " : "xóa ") + invitee.getFullName() + " khỏi phòng.";
                
                // Thông báo cho B nữa
                notificationService.createNotification(
                    invitee,
                    "Yêu cầu bị từ chối",
                    "Chủ trọ đã từ chối yêu cầu liên quan đến việc bạn " + (residentRequest.getRequestType() == iuh.se.kltn.backend.modules.contract.enums.ResidentRequestType.ADD ? "vào ở" : "rời phòng") + " tại phòng " + residentRequest.getContract().getRoom().getName(),
                    NotificationType.CONTRACT_UPDATE,
                    residentRequest.getContract().getId()
                );
            }
        }

        ResidentRequest updated = residentRequestRepository.save(residentRequest);

        // Gửi thông báo chính cho người yêu cầu (Tenant A)
        if (!title.isEmpty()) {
            notificationService.createNotification(
                requester,
                title,
                msg,
                NotificationType.CONTRACT_UPDATE,
                residentRequest.getContract().getId()
            );
        }

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