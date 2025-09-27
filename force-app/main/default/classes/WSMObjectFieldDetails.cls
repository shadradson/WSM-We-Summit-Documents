public with sharing class WSMObjectFieldDetails {
    public class FieldDetail {
        @AuraEnabled
        public String label;
        @AuraEnabled
        public String apiName;
        @AuraEnabled
        public String fieldType;
        
        public FieldDetail(String label, String apiName, String fieldType) {
            this.label = label;
            this.apiName = apiName;
            this.fieldType = fieldType;
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<FieldDetail> getFieldDetails(String objectApiName) {
        List<FieldDetail> fieldDetails = new List<FieldDetail>();

        // Fetch the global describe map to get the desired object.
        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        Schema.SObjectType objectType = gd.get(objectApiName);

        if (objectType != null) {
            // Retrieve the describe result of the object.
            Schema.DescribeSObjectResult objectDescribe = objectType.getDescribe();
            // Get all fields from the object describe result.
            Map<String, Schema.SObjectField> fields = objectDescribe.fields.getMap();
            
            for (String fieldName : fields.keySet()) {
                // Describe each field to access details
                Schema.DescribeFieldResult fieldDescribe = fields.get(fieldName).getDescribe();
                
                // Gather the field label, API name, and type.
                String fieldLabel = fieldDescribe.getLabel();
                String fieldApiName = fieldDescribe.getName();
                String fieldType = String.valueOf(fieldDescribe.getType());
                
                // If it's a relationship field, adjust the field type to include reference information
                if (fieldDescribe.getType() == Schema.DisplayType.Reference) {
                    fieldType += ' (Reference to ' + String.join(fieldDescribe.getReferenceTo(), ', ') + ')';
                }

                // Add the field details to the list.
                fieldDetails.add(new FieldDetail(fieldLabel, fieldApiName, fieldType));
            }
        } else {
            throw new ObjectNotFoundException('Object API name not found in schema.');
        }

        return fieldDetails;
    }
    
    public class ObjectNotFoundException extends Exception {}
}