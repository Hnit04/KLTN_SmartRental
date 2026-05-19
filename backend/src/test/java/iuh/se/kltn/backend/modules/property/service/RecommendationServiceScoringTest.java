package iuh.se.kltn.backend.modules.property.service;

import iuh.se.kltn.backend.common.utils.JsonUtil;
import iuh.se.kltn.backend.modules.property.entity.Room;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RecommendationServiceScoringTest {

    private final RecommendationService service = new RecommendationService();

    @Test
    void priceFit_shouldStayReasonableWhenTargetRangeIsVeryNarrow() throws Exception {
        double fit = invokeComputePriceFit(3_100_000d, 3_000_000d, 3_000_000d);
        assertThat(fit).isGreaterThan(0.70);
    }

    @Test
    void beta_shouldFollowDynamicRuleByActiveCriteriaCount() throws Exception {
        assertThat(invokeResolveDynamicBeta(0)).isEqualTo(0.0);
        assertThat(invokeResolveDynamicBeta(1)).isEqualTo(0.20);
        assertThat(invokeResolveDynamicBeta(2)).isEqualTo(0.30);
        assertThat(invokeResolveDynamicBeta(3)).isEqualTo(0.30);
        assertThat(invokeResolveDynamicBeta(4)).isEqualTo(0.35);
    }

    @Test
    void normalizeText_shouldLowercaseAndRemoveVietnameseDiacritics() throws Exception {
        String normalized = invokeNormalizeText("Quan 7, cho nuoi thu cung");
        assertThat(normalized).isEqualTo("quan 7 cho nuoi thu cung");
    }

    @Test
    void petFit_shouldReturnAllowUnknownAndForbidLevels() throws Exception {
        Room allowRoom = new Room();
        allowRoom.setAmenities(JsonUtil.convertListToJson(List.of("Pet Friendly", "May giat")));
        allowRoom.setDefaultTerms("");
        allowRoom.setDescription("");

        Room unknownRoom = new Room();
        unknownRoom.setAmenities(JsonUtil.convertListToJson(List.of("May lanh")));
        unknownRoom.setDefaultTerms("");
        unknownRoom.setDescription("");

        Room forbidRoom = new Room();
        forbidRoom.setAmenities(JsonUtil.convertListToJson(List.of("An ninh")));
        forbidRoom.setDefaultTerms("Khong nuoi thu cung");
        forbidRoom.setDescription("");

        assertThat(invokeComputePetFit(allowRoom)).isEqualTo(1.0);
        assertThat(invokeComputePetFit(unknownRoom)).isEqualTo(0.5);
        assertThat(invokeComputePetFit(forbidRoom)).isEqualTo(0.0);
    }

    private double invokeComputePriceFit(Double roomPrice, Double min, Double max) throws Exception {
        Method m = RecommendationService.class.getDeclaredMethod("computePriceFit", Double.class, Double.class, Double.class);
        m.setAccessible(true);
        return (double) m.invoke(service, roomPrice, min, max);
    }

    private double invokeResolveDynamicBeta(int activeCriteria) throws Exception {
        Method m = RecommendationService.class.getDeclaredMethod("resolveDynamicBeta", int.class);
        m.setAccessible(true);
        return (double) m.invoke(service, activeCriteria);
    }

    private String invokeNormalizeText(String input) throws Exception {
        Method m = RecommendationService.class.getDeclaredMethod("normalizeText", String.class);
        m.setAccessible(true);
        return (String) m.invoke(service, input);
    }

    private double invokeComputePetFit(Room room) throws Exception {
        Method m = RecommendationService.class.getDeclaredMethod("computePetFit", Room.class);
        m.setAccessible(true);
        return (double) m.invoke(service, room);
    }
}
