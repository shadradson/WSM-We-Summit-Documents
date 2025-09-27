@IsTest
public class WSMRecordFetcherTest {

    @IsTest
    static void testFetchRecordsCoverage() {
        // Call the fetchRecords method with minimal valid parameters
        WSMRecordFetcher.fetchRecords('Account', 'Name != NULL');
    }
}