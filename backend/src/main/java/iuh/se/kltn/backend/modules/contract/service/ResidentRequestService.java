package iuh.se.kltn.backend.modules.contract.service;

import iuh.se.kltn.backend.modules.contract.dto.response.ResidentRequestResponse;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.entity.ResidentRequest;
import iuh.se.kltn.backend.modules.contract.enums.RequestStatus;
import iuh.se.kltn.backend.modules.contract.repository.ContractRepository;
import iuh.se.kltn.backend.modules.contract.repository.ResidentRequestRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ResidentRequestService {
    @Autowired private ResidentRequestRepository residentRequestRepository;
    @Autowired private ContractRepository contractRepository;
    @Autowired private ModelMapper modelMapper;

    @Transactional
    public ResidentRequestResponse createRequest(ResidentRequest request) {

        Contract contract = contractRepository.findById(request.getContract().getId())
                .orElseThrow(() -> new RuntimeException("Hợp đồng không tồn tại"));
        request.setContract(contract);
        ResidentRequest saved = residentRequestRepository.save(request);
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

        residentRequest.setStatus(status);
        ResidentRequest updated = residentRequestRepository.save(residentRequest);

        return mapToResponse(updated);
    }
    private ResidentRequestResponse mapToResponse(ResidentRequest request) {
        ResidentRequestResponse res = modelMapper.map(request, ResidentRequestResponse.class);
        res.setContractId(request.getContract().getId());
        return res;
    }
}