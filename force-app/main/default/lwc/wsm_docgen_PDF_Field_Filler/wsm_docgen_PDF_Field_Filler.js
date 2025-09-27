import { LightningElement, api, track } from 'lwc';
import { FlowNavigationNextEvent, FlowNavigationBackEvent, FlowNavigationFinishEvent } from 'lightning/flowSupport';
import getPDFContentBase64 from '@salesforce/apex/PDFController.getPDFContentBase64';
import WSMRecordFetcherSOQLOnly from '@salesforce/apex/WSMRecordFetcher.WSMRecordFetcherSOQLOnly';
import JS_PDF_LIB from '@salesforce/resourceUrl/pdfLib';
import fontkit from '@salesforce/resourceUrl/fontkit';
import { loadScript } from 'lightning/platformResourceLoader';
import fontBrushScript from '@salesforce/resourceUrl/BrushScriptMTItalic'; // Static Resource containing the font file
import savePDFToRecord from '@salesforce/apex/WSMSavePDFToRecord.savePDFToRecord'; // This allows for the saving of a blob to a record. Named signature, but used for the pdf rendered too.

export default class Wsm_docgen_PDF_Field_Filler extends LightningElement {

    pdfLibInitialized = false;
    pdfLibLibrary = null;
    loadedFontKit = null;
    downloadProcessedPDFHREF = '';
    ProcessedPDFBase64 = '';
    ShowNextButton = false;
    loadedPDF = null;
    mappingJson;
    ProgressBarPercent = 0;
    ProgressBarStatus = 'Starting';
    sObjectApiName;
    pdfDoc;
    form;

    @api IncDocumentTemplate;
    @api IncSignatures = [];
    @api contentDocumentId;
    @api recordId;
    @api FlattenFormInput;
    @api autoRunMultipleFlowScreens = false; // This will allow for incoming bool to auto save to record, and next on the flow screen. This will allow for a flow to loop through multiple docgen templates.
    @api GeneratedDocumentName = "GeneratedPDF";



    @track showdownloadlink = false;

    connectedCallback() {
        this.mappingJson = this.IncDocumentTemplate['PDF_Field_Definitions_JSON__c'];
        this.contentDocumentId = this.IncDocumentTemplate['PDF_Content_Document_Id__c'];
        this.sObjectApiName = this.IncDocumentTemplate['Object_API_Name__c'];
        this.setProgressBar(0, 'Starting Program');// Set Progress Bar
    }

    renderedCallback() {

        if (!this.pdfLibInitialized) {
            this.pdfLibInitialized = true;
            loadScript(this, JS_PDF_LIB)
                .then(() => {
                    console.log('PDF-Lib loaded successfully');
                    this.setProgressBar(10, 'Loaded Tools');// Set Progress Bar
                    this.pdfLibLibrary = window.PDFLib; // Reference the loaded library
                    loadScript(this, fontkit)
                    .then(() => {
                        this.loadedFontKit = window.fontkit; // Reference the loaded library
                        this.handleawaitOrch();
                    })
                    .catch((error) => {console.error('Error loading Fontkit', error);})
                    
                    
                })
                .catch((error) => {
                    console.error('Error loading PDF-Lib', error);
                });
        }
    }

    setProgressBar(incPercent, incStatus) {
        //console.log("Uh hello?", incPercent, incStatus);
        this.ProgressBarPercent = incPercent;
        this.ProgressBarStatus = incStatus;
    }

    async handleawaitOrch() {
        // load the pdf into memory
        this.loadedPDF = await this.loadPDF();
        this.setProgressBar(20, 'Loaded PDF');// Set Progress Bar

        // get merges in the mapping JSON from SOQL
        let gottedMergesData = await this.getAllDocumentMergeFields(this.mappingJson);
        this.setProgressBar(40, 'Processing Mapping JSON');// Set Progress Bar

        // replace merges with record data in the JSON
        this.mappingJson = await this.replaceMergeFields(this.mappingJson, gottedMergesData);
        this.setProgressBar(60, 'Processing Mapping JSON');// Set Progress Bar

        // get merges in the mapping JSON from SOQL
        let gottedSOQLMERGESData = await this.getAllDocumentSOQLFields(this.mappingJson);
        this.setProgressBar(40, 'Processing Mapping JSON');// Set Progress Bar

        // replace merges with record data in the JSON
        this.mappingJson = await this.replaceSOQLFields(this.mappingJson, gottedSOQLMERGESData);
        this.setProgressBar(60, 'Processing Mapping JSON');// Set Progress Bar

        // Processing the pdf with the Mapping JSON
        await this.processPdf(this.loadedPDF);
        this.setProgressBar(100, 'Creating Filled PDF');// Set Progress Bar
    }

    async loadPDF() {
        const pdfBase64 = await getPDFContentBase64({ contentDocumentId: this.contentDocumentId });
        if (!pdfBase64) {
            throw new Error('PDF content is empty or invalid');
        }
        //console.log('PDF Base64 Content:', pdfBase64.substring(0, 100));

        // Decode base64 PDF content into Uint8Array
        const pdfData = new Uint8Array(
            atob(pdfBase64)
                .split('')
                .map((c) => c.charCodeAt(0))
        );
        console.log('Decoded PDF Data:', pdfData);
        return pdfData;
    }



    async processPdf() {
        try {
            if (!this.pdfLibLibrary) {
                throw new Error('PDF-Lib library is not initialized');
            }
            // Load the PDF document
            this.pdfDoc = await this.pdfLibLibrary.PDFDocument.load(this.loadedPDF);

            // Embed the standard font
            console.log("Loading Standard Font")
            const timesItalic = await this.pdfDoc.embedFont(this.pdfLibLibrary.StandardFonts.TimesRomanBoldItalic);
            if (!timesItalic) {
                throw new Error('Failed to embed Times Italic font');
            }
            console.log('Font successfully embedded:', timesItalic);

            // Load the Font Embed Js from SR and register in PDF-LIB
            let fontkit2 = this.loadedFontKit;
            this.pdfDoc.registerFontkit(fontkit2);
            console.log("Font Kit", fontkit2);

            // Fetch and embed the Brush Script MT Italic font
            const fontBytes = await fetch(fontBrushScript).then(res => res.arrayBuffer());
            console.log("Font Bytes", fontBytes);
            let font = await fontkit2.create(fontBytes);
            //console.log("FontKit imported Font: ",font);
            const customFont = await this.pdfDoc.embedFont(fontBytes);
            

            // Get the form from the PDF document
            this.form = this.pdfDoc.getForm();
            const mapping = JSON.parse(this.mappingJson);

            // testing things out for png entry.c/project_Tasks_Kanban TESTING  TESTING  TESTING  TESTING  TESTING  TESTING  TESTING 
            // Fill the signatures
            console.log("Incoming Signatures ", JSON.stringify(this.IncSignatures));
            if (this.IncSignatures.length > 0 && this.IncSignatures != undefined && this.IncSignatures != null) {

                for (let i = 0; i < this.IncSignatures.length; i++) {
                    let sig = this.IncSignatures[i];
                    if (sig.Signature_Method__c == "Text Entry") {
                        console.log(sig.Name, " Entering Signature Text Entry on field named: ", sig.Field_Name__c)

                        const sigfield = this.form.getField('print-name');
                        //console.log("Found Sig Field", JSON.stringify(sigfield));
                        let FullName = sig.Signature_First_Name__c + " " + sig.Signature_Middle_Initial__c + " " + sig.Signature_Last_Name__c;
                        sigfield.setText(FullName.toString());


                    }
                    else if (sig.Signature_Method__c == "Signature Box") {
                        if (sig.ContentDocumentId_of_Signature__c != "" && sig.ContentDocumentId_of_Signature__c != null && sig.ContentDocumentId_of_Signature__c != undefined) {

                            // Get the Signature.PNG in base 64
                            let sigCDI = sig.ContentDocumentId_of_Signature__c;
                            const currentLoopSigImageBytes = await getPDFContentBase64({ contentDocumentId: sigCDI });
                            console.log("PNG", currentLoopSigImageBytes); // Check the output

                        }
                    }

                }
            }

            mapping.forEach(async (fieldDef) => {
                if (!fieldDef.skip) {
                    try {
                        //"Checkbox"
                        //"Signature Box"
                        //"Unknown"
                        //"Dropdown"
                        //"Options List"
                        //"Radio Group"
                        //"Text"
                        //console.log(JSON.stringify(fieldDef));
                        if (fieldDef.DeepFieldType == "Text") {
                            const field = this.form.getTextField(fieldDef.Name);
                            const value = fieldDef.IncData;
                            if (value !== undefined && value != "" && field) {
                                field.setText(value.toString());
                                this.logConsoleDebug("Inputting TEXT Data " + fieldDef.IncData + " into field " + fieldDef.Name,"log");

                                // Update the appearance to use the existing font if is signature
                                if(fieldDef.signature) {
                                    field.setFontSize(14);
                                    field.updateAppearances(customFont);
                                    this.logConsoleDebug("Signature Updated Appearence " + fieldDef.IncData + " into field " + fieldDef.Name,"log");
                                }
                                
                                await this.setProgressBar(20, "Inputting TEXT Data " + fieldDef.IncData + " into field " + fieldDef.Name);// Set Progress Bar
                            } else {
                                this.logConsoleDebug("Could not find Text Field: " + fieldDef.Name,"warn");
                            }
                        }
                        if (fieldDef.DeepFieldType == "Dropdown") {
                            this.logConsoleDebug("Inputting Picklist TEXT Data " + fieldDef.IncData + " into field " + fieldDef.Name,"log");
                            this.setProgressBar(20, "Inputting TEXT Data " + fieldDef.IncData + " into field " + fieldDef.Name);// Set Progress Bar
                            const field = this.form.getDropdown(fieldDef.Name);
                            const value = fieldDef.IncData;
                            if (value !== undefined && value != "" && field) {
                                field.select(value.toString());
                                this.logConsoleDebug("Success Putting " + fieldDef.IncData + " into field " + fieldDef.Name,"log");
                            } else {
                                this.logConsoleDebug("Could not find picklist: " + fieldDef.Name,"warn");
                            }
                        }
                        if (fieldDef.DeepFieldType == "Checkbox") {
                            const field = this.form.getCheckBox(fieldDef.Name);
                            if (fieldDef.UserSettings == "sfm") { if (fieldDef.IncData == "true") { field.check(); } else { field.uncheck(); } }
                            else if (fieldDef.UserSettings == "at") { field.check(); }
                            else { field.uncheck(); }
                            this.logConsoleDebug("Inputting Bool Data " + fieldDef.IncData + " into field " + fieldDef.Name,"log");
                            this.setProgressBar(20, "Inputting TEXT Data " + fieldDef.IncData + " into field " + fieldDef.Name);// Set Progress Bar
                        }
                        if (fieldDef.DeepFieldType == "Radio Group") {
                            const field = this.form.getRadioGroup(fieldDef.Name);
                            const value = fieldDef.IncData;
                            if (value !== undefined && value != "" && field) {
                                field.select(value.toString());
                                this.logConsoleDebug("Inputting TEXT Data " + fieldDef.IncData + " into field " + fieldDef.Name + " type: Radio Group","log");
                                await this.setProgressBar(20, "Inputting TEXT Data " + fieldDef.IncData + " into field " + fieldDef.Name);// Set Progress Bar
                            } else {
                                this.logConsoleDebug("Could not find Radio Group: " + fieldDef.Name,"warn");
                            }
                        }
                    }
                    catch (error) {
                        console.error("Oh Noes. Field Fill Function Failure: Error ", error.toString());
                    }
                }
            });


            if (this.FlattenFormInput) {
                this.form.flatten();
            }

            // save the pdf.
            const pdfBytes = await this.pdfDoc.save({ updateFieldAppearances: true, useObjectStreams: true });
            
            // Convert PDF to base64 to save to record.
            let binary = '';
            const len = pdfBytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(pdfBytes[i]); // Convert to binary string
            }
            this.ProcessedPDFBase64 = btoa(binary); // Encode binary string to Base64
            
            // Save the updated PDF to blob for viewing in the browser.
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            // Create a download link for the PDF
            this.downloadProcessedPDFHREF = await URL.createObjectURL(blob);
            //console.log(this.downloadProcessedPDFHRE);

            // Decide if it is on Auto Loop through Docgen Templates, or single template
            if(this.autoRunMultipleFlowScreens) {
                this.savePDFToRecord();
            }
            else {
                this.showdownloadlink = true;
                this.ShowNextButton = true;
            }
        } catch (error) {
            console.error('Error processing PDF:', error.message || error, error.stack);
        }
    }

    async getAllDocumentMergeFields(incMapping) {
        let AllMergeFields = this.extractMergeFields(incMapping);

        if (AllMergeFields == null || AllMergeFields == "" || AllMergeFields.length == 0) {
            console.log("No Merges Found in JSON");
            return incMapping;
        }

        else {
            let MergeQueryFields = "";
            let CommaHolder = "";
            console.log("All Merge Fields Found ", JSON.stringify(AllMergeFields));
            for (var i = 0; i < AllMergeFields.length; i++) {

                // determine the need for a comma
                if (i == 0) {
                    CommaHolder = "";
                }
                else {
                    CommaHolder = ", ";
                }
                //console.log("Loop " + i + " Comma = " + CommaHolder);

                // 
                if (AllMergeFields[i] == undefined) {
                    console.log("Undefined Filtered")
                    this.logConsoleDebug("Undefined Filtered: ","warn");
                }
                else if (MergeQueryFields.includes(AllMergeFields[i])) {
                    this.logConsoleDebug("Duplicate Merge Field: " + AllMergeFields[i],"log");
                }
                else {
                    MergeQueryFields += CommaHolder + AllMergeFields[i];
                }
            }
            let CompiledQuery = 'SELECT ' + MergeQueryFields + ' FROM ' + this.sObjectApiName + ' WHERE Id = \'' + this.recordId + '\'';
            console.log(CompiledQuery);
            let returnedCuratedRecord = await this.LoadFromSOQLQuery(CompiledQuery);
            console.log("Queried Record for Merges", JSON.stringify(returnedCuratedRecord));
            return returnedCuratedRecord;
        }

    }

    extractMergeFields(richText) {
        console.log(richText);
        const mergeFields = [];
        const regexPattern = `{{${this.sObjectApiName}.(.*?)}}`;
        console.log(regexPattern);
        const regex = new RegExp(regexPattern, "g");
        const matches = Array.from(richText.matchAll(regex), m => m[1]);

        matches.forEach(mtch => {
            console.log(mtch);
            const FieldSOQLNotation = mtch;
            mergeFields.push(FieldSOQLNotation);
        });

        return mergeFields;
    }

    async LoadFromSOQLQuery(query) {
        try {
            const data = await WSMRecordFetcherSOQLOnly({ SOQLQuery: query });
            let records = data;
            let error = undefined;
            this.logConsoleDebug("Record in the SOQL Query Function: " + JSON.stringify(records),"log");
            return records;
        } catch (error) {
            console.error('Error fetching records:', error);
            return error;
        }
    }


    replaceMergeFields(UnreplacedHTML, ReplacementData) {
        //console.log("Data from SOQL Query ", JSON.stringify(ReplacementData));

        // Assuming the object has the correct structure and there's at least one object in the array
        const data = ReplacementData[0];  // Access the first object in the array if that's your use case
        const objectApiNameCamelCase = this.sObjectApiName;  // Assuming 'Lead' is the correct API name prefix as seen in the HTML

        // Update the regex to correctly match fields with the 'Lead' prefix
        const regexPattern = `{{${objectApiNameCamelCase}\.(.*?)}}`;
        const regex = new RegExp(regexPattern, "g");

        const replacedText = UnreplacedHTML.replace(regex, (match, p1) => {
            //return data[p1] || match;  // Replace with data from the object or leave unchanged if not found
            if (data[p1] != undefined) {
                return data[p1];  // Return the replacement data if it is not undefined.
            }
            else {
                return "";  // Return null if not found.
            }
        });
        return replacedText;
    }

    async getAllDocumentSOQLFields(incMapping) {
        let AllMergeFields = this.extractSOQLFields(incMapping);
        let AllReturns = [];

        if (AllMergeFields == null || AllMergeFields == "" || AllMergeFields.length == 0) {
            console.log("No SOQL Fields Found in JSON");
            return incMapping;
        }

        else {
            console.log("All Merge Fields Found ", JSON.stringify(AllMergeFields));
            for (var i = 0; i < AllMergeFields.length; i++) {
                let currentLoopThroughSOQLs = AllMergeFields[i];
                let CompiledQuery = "SELECT " + currentLoopThroughSOQLs['SFfieldAPI'] + " FROM " + currentLoopThroughSOQLs['SFobjAPI'] + " WHERE " + currentLoopThroughSOQLs['whereClause'];
                console.log(CompiledQuery);
                let SOQLReturnDataArr = await this.LoadFromSOQLQuery(CompiledQuery);
                let SOQLReturnData = SOQLReturnDataArr[0];
                currentLoopThroughSOQLs['returnedDATA'] = SOQLReturnData;
                let fieldAPI = currentLoopThroughSOQLs['SFfieldAPI'];
                currentLoopThroughSOQLs['extractedDATA'] = SOQLReturnData[fieldAPI];
                console.log("Queried Record for Merges", JSON.stringify(currentLoopThroughSOQLs));
                AllReturns.push(currentLoopThroughSOQLs);
            }
            return AllReturns;
        }

    }

    extractSOQLFields(richText) {
        console.log("Starting SOQL merges");
        console.log(richText);
        const mergeFields = [];
        const regexPattern = `{{WSD:SOQL:(.*?)}}`;
        console.log(regexPattern);
        const regex = new RegExp(regexPattern, "g");
        const matches = Array.from(richText.matchAll(regex), m => m[1]);
        
        matches.forEach(mtch => {
            this.logConsoleDebug("Match Found in SOQL Merges: " + mtch, "log");
            let matchParsed = mtch.split(":");
            // Create a new object for each iteration
            let singleMatchJSONOut = {};
            singleMatchJSONOut['originalSTR'] = mtch;
            singleMatchJSONOut['SFfieldAPI'] = matchParsed[0];
            singleMatchJSONOut['SFobjAPI'] = matchParsed[1];
            singleMatchJSONOut['whereClause'] = matchParsed[2];
            mergeFields.push(singleMatchJSONOut);
        });
    
        return mergeFields;
    }
    

    replaceSOQLFields(UnreplacedHTML, ReplacementData) {
        let data = {};
        // Assuming the object has the correct structure and there's at least one object in the array
        for (let i = 0; i < ReplacementData.length; i++) {
            let dataPRE = ReplacementData[i];
            let SOQLFieldDesc = dataPRE['originalSTR'];
            let ObjectData = dataPRE['extractedDATA'];
            this.logConsoleDebug("SOQL Query Ready to Zip - " + SOQLFieldDesc + " - " + ObjectData + " - " + JSON.stringify(dataPRE));
            data[SOQLFieldDesc] = ObjectData;
            this.logConsoleDebug("Data from SOQL Query Unroll: " + JSON.stringify(data),"log");
        }
        console.log("Structure for replacing SOQL Fields ", JSON.stringify(data));

        // Update the regex to correctly match fields with the 'Lead' prefix
        const regexPattern = `{{WSD:SOQL:(.*?)}}`;
        const regex = new RegExp(regexPattern, "g");

        const replacedText = UnreplacedHTML.replace(regex, (match, p1) => {
            //return data[p1] || match;  // Replace with data from the object or leave unchanged if not found
            if (data[p1] != undefined) {
                return data[p1];  // Return the replacement data if it is not undefined.
            }
            else {
                return "";  // Return null if not found.
            }
        });
        return replacedText;
    }

        savePDFToRecord() {
            console.log("Saving To Record");
            let RecordIdToSaveTo = this.recordId;
            console.log("Saving to Record Id", RecordIdToSaveTo)
            //String recordId, String base64Data, String IncTitle
            savePDFToRecord({ recordId: RecordIdToSaveTo, base64Data: this.ProcessedPDFBase64, IncTitle: this.GeneratedDocumentName })
                .then(result => {
                    console.log('PDF saved:', result);
                    //this.CreatedSignatureContentDocumentId = result;
                    
                    // evaluate if the flow is in autoRunMultipleFlowScreens mode, and automatically nav to the next flow screen.
                    if(this.autoRunMultipleFlowScreens) {
                        this.navigateNext();  // Navigate to the next screen in the flow
                    }

                    this.ShowSavedMessage = true;
                })
                .catch(error => {
                    console.error('Error saving signature:', error);
                    // Handle errors, possibly navigate back or show a message
                });
    
        }
    
        logConsoleDebug(Message,Type) {
            const log = false;
            if(log) {
                if( Type = "log") { console.log(Message) }
                else if( Type = "error") { console.error(Message) }
                else if( Type = "warn") { console.warn(Message) }
            }
        }

    navigateNext() {
        // Fire the Flow Navigation Next Event
        this.dispatchEvent(new FlowNavigationNextEvent());
    }
}