@isTest
public class PDFControllerTest {

    @isTest
    static void testGetPDFContentBase64() {
        // Set up test data for ContentVersion
        ContentVersion cv = new ContentVersion(
            Title = 'Test PDF',
            PathOnClient = 'TestPDF.pdf',
            VersionData = Blob.valueOf('Test content'),
            IsMajorVersion = true
        );
        insert cv;

        // Retrieve the newly created ContentDocumentId from ContentVersion
        Id contentDocumentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;

        // Call the method
        String result = PDFController.getPDFContentBase64(contentDocumentId);

        // Assert result is not null
        System.assertNotEquals(null, result);
    }

    @isTest
    static void testGetObjectData() {
        // Set up test data for an sObject, e.g., Account
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;

        // Fields to retrieve
        List<String> fields = new List<String>{'Name'};

        // Call the method
        Map<String, Object> result = PDFController.getObjectData(testAccount.Id, fields, 'Account');

        // Assert that the result map is not empty and contains the 'Name' field
        System.assertNotEquals(null, result);
        System.assertEquals('Test Account', result.get('Name'));
    }
}