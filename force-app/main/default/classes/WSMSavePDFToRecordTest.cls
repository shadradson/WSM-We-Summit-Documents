@isTest
public class WSMSavePDFToRecordTest {
    @isTest
    static void testSavePDFToRecord() {
        // Create a test record, using Account as an example. Change this to any object you have permissions for.
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;

        // Simulate a base64 encoded PNG image (a small red dot)
        String base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
        String testTitle = 'testthispdf';

        // Call the method from the Apex class
        Test.startTest();
        String contentDocumentId = WSMSavePDFToRecord.savePDFToRecord(testAccount.Id, base64Data, testTitle);
        Test.stopTest();

        // Assert that the method returns a non-null, non-empty string
        System.assert(String.isNotBlank(contentDocumentId), 'The method should return a non-blank ContentDocumentId.');
    }
}