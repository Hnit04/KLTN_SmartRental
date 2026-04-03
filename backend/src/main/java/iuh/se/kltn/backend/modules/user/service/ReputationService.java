package iuh.se.kltn.backend.modules.user.service;

import iuh.se.kltn.backend.modules.user.entity.ReputationHistory;
import iuh.se.kltn.backend.modules.user.entity.User;
import iuh.se.kltn.backend.modules.user.enums.ReputationAction;
import iuh.se.kltn.backend.modules.user.repository.ReputationHistoryRepository;
import iuh.se.kltn.backend.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReputationService {

    private final UserRepository userRepository;
    private final ReputationHistoryRepository historyRepository;

    @Transactional
    public void processPoints(User user, ReputationAction action, int points, String description) {
        // Có một số action chỉ được cộng điểm 1 lần (EKyc, Wallet)
        if (action == ReputationAction.EKYC_VERIFIED || action == ReputationAction.WALLET_LINKED) {
            if (historyRepository.existsByUserIdAndActionType(user.getId(), action)) {
                return; // Đã nhận điểm cho hành động này rồi
            }
        }

        // Tính toán điểm mới (Clamp từ 0 đến 100)
        int currentScore = user.getReputationScore();
        int newScore = currentScore + points;

        if (newScore > 100) {
            newScore = 100;
        } else if (newScore < 0) {
            newScore = 0;
        }



        // Nếu điểm không đổi (ví dụ đã 100 rồi mà cộng thêm), vẫn có thể lưu lịch sử hoặc bỏ qua
        // Tuy nhiên tốt nhất là lưu lại để track record minh bạch
        
        user.setReputationScore(newScore);
        userRepository.save(user);

        ReputationHistory history = new ReputationHistory();
        history.setUser(user);
        history.setActionType(action);
        history.setPointsChanged(points); // Ghi nhận số điểm thô để thống kê, dù bị clamp
        history.setDescription(description);
        
        historyRepository.save(history);
    }
}
