public with sharing class ObjectInfoUtility {

    // Define a wrapper class for input parameters
    public class Request {
        @InvocableVariable(label='Operation Type' description='Enter "prefix" to get prefix, "name" to get API Name')
        public String operationType;

        @InvocableVariable(label='Object Identifier' description='Enter Object API Name or Prefix')
        public String objectIdentifier;
    }

    // Define a wrapper class for output results
    public class Response {
        @InvocableVariable
        public String result;
    }

    // Unified Invocable Method to handle both operations
    @InvocableMethod(label='Get Object Information' description='Gets either the prefix or the API Name based on the operation type')
    public static List<Response> getObjectInfo(List<Request> requests) {
        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        List<Response> results = new List<Response>();

        for (Request req : requests) {
            Response res = new Response();
            if (req.operationType == 'prefix') {
                Schema.SObjectType sObjType = gd.get(req.objectIdentifier);
                if (sObjType != null) {
                    Schema.DescribeSObjectResult dRes = sObjType.getDescribe();
                    res.result = dRes.getKeyPrefix();
                } else {
                    res.result = 'Invalid Object API Name';
                }
            } else if (req.operationType == 'name') {
                for (String objName : gd.keySet()) {
                    Schema.SObjectType sObjType = gd.get(objName);
                    Schema.DescribeSObjectResult dRes = sObjType.getDescribe();
                    if (dRes.getKeyPrefix() == req.objectIdentifier) {
                        res.result = objName;
                        break;
                    }
                }
                if (res.result == null) {
                    res.result = 'Invalid Prefix';
                }
            }
            results.add(res);
        }
        return results;
    }
}