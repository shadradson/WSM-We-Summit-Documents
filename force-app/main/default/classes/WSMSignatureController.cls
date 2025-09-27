public with sharing class WSMSignatureController {
    @AuraEnabled
    public static String saveSignatureToRecord(String recordId, String base64Data) {
        try {
            // Convert base64 string to a Blob
            Blob contentBlob = EncodingUtil.base64Decode(base64Data);

            // Create ContentVersion to store the file in Salesforce Files
            ContentVersion contentVersion = new ContentVersion();
            contentVersion.Title = 'Signature';
            contentVersion.PathOnClient = 'Signature.png'; // filename to be displayed in Salesforce Files
            contentVersion.VersionData = contentBlob;
            contentVersion.Origin = 'H'; // H for internal user
            contentVersion.ContentLocation = 'S'; // S for within Salesforce, L for external files
            insert contentVersion;

            // Get the ID of the newly created ContentVersion
            Id contentDocumentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :contentVersion.Id].ContentDocumentId;

            // Link the ContentDocument to the record
            ContentDocumentLink contentDocumentLink = new ContentDocumentLink();
            contentDocumentLink.ContentDocumentId = contentDocumentId;
            contentDocumentLink.LinkedEntityId = recordId;
            contentDocumentLink.ShareType = 'V'; // V for Viewer permission, can use 'I' for Inferred permission
            contentDocumentLink.Visibility = 'AllUsers'; // Controls visibility to all users
            insert contentDocumentLink;

            return contentDocumentId;
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }
}