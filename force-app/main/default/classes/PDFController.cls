public with sharing class PDFController {
    @AuraEnabled(cacheable=true)
    public static String getPDFContentBase64(Id contentDocumentId) {
        ContentVersion cv = [
            SELECT VersionData 
            FROM ContentVersion 
            WHERE ContentDocumentId = :contentDocumentId 
            ORDER BY VersionNumber DESC 
            LIMIT 1
        ];
        Blob pdfBlob = cv.VersionData;
        return EncodingUtil.base64Encode(pdfBlob);
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getObjectData(
        Id recordId, 
        List<String> fields, 
        String sObjectApiName
    ) {
        String query = 'SELECT ' + String.join(fields, ',') + 
                       ' FROM ' + sObjectApiName + ' WHERE Id = :recordId';
        SObject sobj = Database.query(query);
        Map<String, Object> result = new Map<String, Object>();
        for (String field : fields) {
            result.put(field, sobj.get(field));
        }
        return result;
    }

    
}