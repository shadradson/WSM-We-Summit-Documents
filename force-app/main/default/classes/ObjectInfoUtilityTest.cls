@isTest
public class ObjectInfoUtilityTest {

    @isTest
    static void testGetPrefix() {
        // Setup test data
        String objectApiName = 'Account';

        // Prepare the request
        ObjectInfoUtility.Request req = new ObjectInfoUtility.Request();
        req.operationType = 'prefix';
        req.objectIdentifier = objectApiName;
        List<ObjectInfoUtility.Request> requests = new List<ObjectInfoUtility.Request>{req};

        // Execute the method
        Test.startTest();
        List<ObjectInfoUtility.Response> responses = ObjectInfoUtility.getObjectInfo(requests);
        Test.stopTest();

        // Verify the results
        System.assertNotEquals(null, responses);
        System.assertEquals(1, responses.size());
        System.assertEquals('001', responses[0].result); // Typically '001' is the prefix for Account
    }

    @isTest
    static void testGetApiName() {
        // Setup test data
        String prefix = '001'; // Assuming '001' is the prefix for Account in your environment
    
        // Prepare the request
        ObjectInfoUtility.Request req = new ObjectInfoUtility.Request();
        req.operationType = 'name';
        req.objectIdentifier = prefix;
        List<ObjectInfoUtility.Request> requests = new List<ObjectInfoUtility.Request>{req};
    
        // Execute the method
        Test.startTest();
        List<ObjectInfoUtility.Response> responses = ObjectInfoUtility.getObjectInfo(requests);
        Test.stopTest();
    
        // Verify the results
        System.assertNotEquals(null, responses);
        System.assertEquals(1, responses.size());
        // Using toLowerCase for case-insensitive comparison
        System.assertEquals('Account'.toLowerCase(), responses[0].result.toLowerCase(), 'The object name should be Account for prefix 001');
    }
    

    @isTest
    static void testInvalidInput() {
        // Test with invalid operation type
        ObjectInfoUtility.Request reqInvalidOperation = new ObjectInfoUtility.Request();
        reqInvalidOperation.operationType = 'invalid_type';
        reqInvalidOperation.objectIdentifier = 'Account';
        List<ObjectInfoUtility.Request> requestsInvalidOperation = new List<ObjectInfoUtility.Request>{reqInvalidOperation};

        // Test with invalid object API name
        ObjectInfoUtility.Request reqInvalidApiName = new ObjectInfoUtility.Request();
        reqInvalidApiName.operationType = 'prefix';
        reqInvalidApiName.objectIdentifier = 'InvalidAPIName';
        List<ObjectInfoUtility.Request> requestsInvalidApiName = new List<ObjectInfoUtility.Request>{reqInvalidApiName};

        // Execute the tests
        Test.startTest();
        List<ObjectInfoUtility.Response> responsesInvalidOperation = ObjectInfoUtility.getObjectInfo(requestsInvalidOperation);
        List<ObjectInfoUtility.Response> responsesInvalidApiName = ObjectInfoUtility.getObjectInfo(requestsInvalidApiName);
        Test.stopTest();

        // Verify the results
        System.assertEquals('Invalid Object API Name', responsesInvalidApiName[0].result); // Expects an error message for invalid API name
        System.assertEquals(null, responsesInvalidOperation[0].result); // Expects null result for invalid operation type
    }
}