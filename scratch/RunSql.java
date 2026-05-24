import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class RunSql {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";
        String user = "postgres.mnuoprhnzywzszwoodoz";
        String password = "Tinh123.@123";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {

            int propertiesUpdated = stmt.executeUpdate("UPDATE properties SET version = 0 WHERE version IS NULL");
            System.out.println("Properties updated: " + propertiesUpdated);

            int roomsUpdated = stmt.executeUpdate("UPDATE rooms SET version = 0 WHERE version IS NULL");
            System.out.println("Rooms updated: " + roomsUpdated);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
