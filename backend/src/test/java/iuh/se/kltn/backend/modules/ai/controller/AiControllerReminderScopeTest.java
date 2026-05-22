package iuh.se.kltn.backend.modules.ai.controller;

import iuh.se.kltn.backend.modules.contract.entity.Bill;
import iuh.se.kltn.backend.modules.contract.entity.Contract;
import iuh.se.kltn.backend.modules.contract.enums.BillStatus;
import iuh.se.kltn.backend.modules.property.entity.Property;
import iuh.se.kltn.backend.modules.property.entity.Room;
import iuh.se.kltn.backend.modules.user.entity.Landlord;
import iuh.se.kltn.backend.modules.user.entity.Tenant;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AiControllerReminderScopeTest {

    private final AiController controller = new AiController();

    @Test
    void shouldNormalizeReminderScopeSafely() throws Exception {
        assertThat(invokeNormalizeReminderScope("DUE_SOON")).isEqualTo("DUE_SOON");
        assertThat(invokeNormalizeReminderScope("overdue")).isEqualTo("OVERDUE");
        assertThat(invokeNormalizeReminderScope("anything-else")).isEqualTo("OVERDUE");
        assertThat(invokeNormalizeReminderScope(null)).isEqualTo("OVERDUE");
    }

    @Test
    void shouldFilterOverdueBillsByStatusAndDeadline() throws Exception {
        LocalDateTime now = LocalDateTime.of(2026, 5, 19, 10, 0);
        Bill lateBill = createBill(1L, 100L, BillStatus.LATE, now.minusDays(5));
        Bill unpaidPastDeadline = createBill(2L, 100L, BillStatus.UNPAID, now.minusDays(1));
        Bill unpaidFuture = createBill(3L, 100L, BillStatus.UNPAID, now.plusDays(2));
        Bill pendingFuture = createBill(4L, 100L, BillStatus.PENDING, now.plusDays(1));

        List<Bill> filtered = invokeFilterBillsByScope(
                List.of(lateBill, unpaidPastDeadline, unpaidFuture, pendingFuture),
                "OVERDUE",
                3,
                now
        );

        assertThat(filtered).extracting(Bill::getId).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void shouldFilterDueSoonBillsWithinDaysAheadWindow() throws Exception {
        LocalDateTime now = LocalDateTime.of(2026, 5, 19, 10, 0);
        Bill unpaidSoon = createBill(1L, 100L, BillStatus.UNPAID, now.plusDays(1));
        Bill pendingSoon = createBill(2L, 100L, BillStatus.PENDING, now.plusDays(3));
        Bill unpaidFar = createBill(3L, 100L, BillStatus.UNPAID, now.plusDays(10));
        Bill lateBill = createBill(4L, 100L, BillStatus.LATE, now.minusDays(2));
        Bill unpaidPast = createBill(5L, 100L, BillStatus.UNPAID, now.minusDays(1));

        List<Bill> filtered = invokeFilterBillsByScope(
                List.of(unpaidSoon, pendingSoon, unpaidFar, lateBill, unpaidPast),
                "DUE_SOON",
                3,
                now
        );

        assertThat(filtered).extracting(Bill::getId).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void shouldValidateBillOwnershipByLandlord() throws Exception {
        Bill landlord1Bill = createBill(1L, 100L, BillStatus.UNPAID, LocalDateTime.now().plusDays(1));
        Bill landlord2Bill = createBill(2L, 200L, BillStatus.UNPAID, LocalDateTime.now().plusDays(1));

        assertThat(invokeIsBillOwnedByLandlord(landlord1Bill, 100L)).isTrue();
        assertThat(invokeIsBillOwnedByLandlord(landlord2Bill, 100L)).isFalse();
        assertThat(invokeIsBillOwnedByLandlord(null, 100L)).isFalse();
    }

    private Bill createBill(Long billId, Long landlordId, BillStatus status, LocalDateTime deadline) {
        Landlord landlord = new Landlord();
        landlord.setId(landlordId);

        Property property = new Property();
        property.setId(landlordId + 10);
        property.setLandlord(landlord);

        Room room = new Room();
        room.setId(landlordId + 20);
        room.setProperty(property);

        Tenant tenant = new Tenant();
        tenant.setId(landlordId + 30);

        Contract contract = new Contract();
        contract.setId(landlordId + 40);
        contract.setRoom(room);
        contract.setTenant(tenant);

        Bill bill = new Bill();
        bill.setId(billId);
        bill.setContract(contract);
        bill.setStatus(status);
        bill.setDeadline(deadline);
        bill.setTotalAmount(1_000_000d);
        return bill;
    }

    @SuppressWarnings("unchecked")
    private List<Bill> invokeFilterBillsByScope(List<Bill> bills, String scope, int daysAhead, LocalDateTime now)
            throws Exception {
        Method method = AiController.class.getDeclaredMethod(
                "filterBillsByReminderScope", List.class, String.class, int.class, LocalDateTime.class);
        method.setAccessible(true);
        return (List<Bill>) method.invoke(controller, bills, scope, daysAhead, now);
    }

    private String invokeNormalizeReminderScope(String scope) throws Exception {
        Method method = AiController.class.getDeclaredMethod("normalizeReminderScope", String.class);
        method.setAccessible(true);
        return (String) method.invoke(controller, scope);
    }

    private boolean invokeIsBillOwnedByLandlord(Bill bill, Long landlordId) throws Exception {
        Method method = AiController.class.getDeclaredMethod("isBillOwnedByLandlord", Bill.class, Long.class);
        method.setAccessible(true);
        return (boolean) method.invoke(controller, bill, landlordId);
    }
}

