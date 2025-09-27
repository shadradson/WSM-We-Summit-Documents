public class RenderPDFFromAnyVFforAnyObject {

    public class FlowInputs{
        @InvocableVariable(label='Visualforce Page API Name' description='This is the visualforce page that needs to be rendered as a PDF. It needs to render to PDF' required = true)
        public String visualforcePageApiName;
        @InvocableVariable(label='Api Name of the Object the VF page uses as a standard controller' description='If it is a custom object, include the __c' required = true)
        public String sobjectName;
        @InvocableVariable(label='Record Id' description='The record ID of the record to feed to the Visualforce page. Must be a record of the object of the VF standard controller.' required = true) 
        public String recordId;   
        @InvocableVariable(label='Title of Output PDF' description='This will be the name of the PDF file that is saved to the record. Do not include ".pdf" to the name. It will append that on generation.' required = true) 
        public String fileTitle;   
    }

    @InvocableMethod(label='WSM Generate VF PDF from Any Object and Attach To Files')
    public static void generateAnyVFPdfAndAttach(List < FlowInputs > Inputs) {

        List<ContentVersion> contentVersionsToInsert = new List<ContentVersion>();
        List<ContentDocumentLink> contentDocumentLinksToInsert = new List<ContentDocumentLink>();
        
        for (FlowInputs ins : Inputs) {
            // Generate the PDF content by rendering the Visualforce page
            PageReference pageRef = new PageReference('/apex/' + ins.visualforcePageApiName);
            pageRef.getParameters().put('id', ins.recordId);
            Blob pdfBlob;

            try {
                pdfBlob = pageRef.getContentAsPDF();
            } catch (VisualforceException e) {
                System.debug('Error generating PDF: ' + e.getMessage());
                continue;
            }
            
            // Create a new ContentVersion
            ContentVersion contentVersion = new ContentVersion();
            contentVersion.Title = ins.fileTitle;
            contentVersion.PathOnClient = ins.fileTitle;
            contentVersion.VersionData = pdfBlob;
            contentVersion.FirstPublishLocationId = ins.recordId;
            contentVersionsToInsert.add(contentVersion);


        }

        // Insert the ContentVersions and ContentDocumentLinks
        insert contentVersionsToInsert;
    }
}