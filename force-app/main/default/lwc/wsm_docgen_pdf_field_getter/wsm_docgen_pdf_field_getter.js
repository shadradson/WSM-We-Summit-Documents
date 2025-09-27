import { LightningElement, api, track } from 'lwc';
import { FlowNavigationNextEvent, FlowNavigationBackEvent, FlowNavigationFinishEvent } from 'lightning/flowSupport';
import getPDFContentBase64 from '@salesforce/apex/PDFController.getPDFContentBase64';
import getObjectData from '@salesforce/apex/PDFController.getObjectData';
import JS_PDF_LIB from '@salesforce/resourceUrl/pdfLib';
import { loadScript } from 'lightning/platformResourceLoader';

export default class Wsm_docgen_pdf_field_getter extends LightningElement {
    pdfLibInitialized = false;
    pdfLibLibrary = null;
    ShowNextButton;
    loadedPDF = null;
    ProgressBarPercent = 0;
    ProgressStatus = '';
    redoJSON = false;
    mappingJsonOBJ = {};

    @api IncDocumentTemplate;
    @api contentDocumentId;
    @api mappingJson; // JSON string of mapping
    @api OutJSON; 
    
    
    @track showdownloadlink = false;

    connectedCallback() {
        this.mappingJson = this.IncDocumentTemplate['PDF_Field_Definitions_JSON__c'];
        if(this.mappingJson != null && this.mappingJson != undefined) {
            this.mappingJsonOBJ = JSON.parse(this.mappingJson);
            this.redoJSON = true;
        }
    }

    renderedCallback() {

        if (!this.pdfLibInitialized) {
            this.pdfLibInitialized = true;
            loadScript(this, JS_PDF_LIB)
                .then(() => {
                    console.log('PDF-Lib loaded successfully');
                    this.pdfLibLibrary = window.PDFLib; // Reference the loaded library
                    this.handleawaitOrch();
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
        this.setProgressBar(20, 'Loaded Tools');
        this.loadedPDF = await this.loadPDF();
        this.setProgressBar(50, "PDF Decoded like cracking an egg open and converting it to a fish");
        this.getPdfFieldNames(this.loadedPDF);
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

    async getPdfFieldNames(pdfData) {
        try {
            // Load the PDF document
            const pdfDoc = await PDFLib.PDFDocument.load(pdfData);
            // Get the form object
            const form = pdfDoc.getForm();
            // Get all fields in the form
            const fields = form.getFields();

            let fieldtemplate = {};
            let outputFields = [];
            // Extract field names
            let currentfieldtype, currentfieldname;
            let fieldNum = 0;
            let currentfielddeeptype = {};
            fields.forEach(field => {
                fieldNum++;
                let findMatch;
                let fieldName = field.getName()
                
                let foundPreExistingField = false;
                if(this.redoJSON) {
                    findMatch = this.mappingJsonOBJ.find(obj => obj['Name'] === fieldName);
                    if(findMatch != null && findMatch != undefined) {
                        foundPreExistingField = true;
                    }
                }


                if(!field.isReadOnly()) { // only output fields that can be edited.
                    currentfieldname = field.getName();
                    this.setProgressBar(60, "Getting Field " + currentfieldname);
                    currentfieldtype = field.constructor.name;
                    currentfielddeeptype = this.fieldDeepQuery(form, currentfieldname, currentfieldtype);

                    fieldtemplate = {
                        Order: fieldNum,
                        Name: fieldName,
                        //ReadOnly: field.isReadOnly(),
                        FieldType: currentfieldtype,
                        DeepFieldType: currentfielddeeptype["DeepType"],
                        UserNote: "",
                        IncData: currentfielddeeptype["InitialValue"],
                    }
                    if(currentfielddeeptype["DeepType"] == "Checkbox") {
                        fieldtemplate["UserSettings"] = currentfielddeeptype["currentFieldUserSettings"];
                    }
                    if(currentfielddeeptype["DeepType"] == "Picklist" || currentfielddeeptype["DeepType"] == "Options List" || currentfielddeeptype["DeepType"] == "Radio Group") {
                        fieldtemplate["Options"] = currentfielddeeptype["Options"];
                    }
                    if (foundPreExistingField) {
                        outputFields.push(findMatch);
                    }
                    else {
                        outputFields.push(fieldtemplate);
                    }
                }
            });
            //const fieldNames = fields.map(field => field.getName());
            //console.log('Field Names:', JSON.stringify(outputFields));
    
            this.OutJSON = JSON.stringify(outputFields);
            console.log("GOT HERE");
            this.setProgressBar(100, "Done");
            this.ShowNextButton = true;
        } catch (error) {
            console.error('Error retrieving field names:', error.message || error);
            throw error;
        }
    }

    fieldDeepQuery(incForm, incFieldName, incFieldType) {
        let returnInfo = {};
        let form = incForm;
        let currentfieldname = incFieldName;
        returnInfo["currentFieldUserSettings"] = "sfm";
        if(incFieldType == "e") {
            try {
                let currentField = form.getCheckBox(currentfieldname);
                if(currentField.length > 0) {
                    let childrenArr = [];
                    currentField.forEach((childbox) => {
                        let childField = form.getCheckBox(childbox);
                        console.log("Child found of checkbox ", childField.getName())
                    });
                }
                returnInfo["DeepType"] = "Checkbox";
                returnInfo["InitialValue"] = "";
                returnInfo["currentFieldUserSettings"] = "af";
                return returnInfo;
            }
            catch {
            }
            try {
                form.getSignature(currentfieldname);
                returnInfo["DeepType"] = "Signature Box";
                returnInfo["InitialValue"] = false;
                return returnInfo;
            }
            catch {
                returnInfo["DeepType"] = "Unknown";
                returnInfo["InitialValue"] = "WARNING";
                return returnInfo;
            }
        }
        if(incFieldType == "r") {
            try {
                let picklist = form.getDropdown(currentfieldname);
                let options = picklist.getOptions();
                console.log(JSON.stringify(options));
                returnInfo["Options"] = options;
                returnInfo["DeepType"] = "Dropdown";
                returnInfo["InitialValue"] = options[0];
                return returnInfo;
            }
            catch {

            }
            try {
                let picklist = form.getOptionList(currentfieldname);
                let options = picklist.getOptions();
                returnInfo["Options"] = options;
                returnInfo["DeepType"] = "Options List";
                returnInfo["InitialValue"] = options[0];
                return returnInfo;
            }
            catch {

            }
            try {
                let picklist = form.getRadioGroup(currentfieldname);
                let options = picklist.getOptions();
                returnInfo["Options"] = options;
                returnInfo["DeepType"] = "Radio Group";
                returnInfo["InitialValue"] = options[0];
                return returnInfo;
            }
            catch {
            }
            try {
                let currentField = form.getTextField(currentfieldname);
                let currentOut = currentField.getText()
                returnInfo["DeepType"] = "Text";
                returnInfo["InitialValue"] = currentOut;
                return returnInfo;
            }
            catch {
                returnInfo["DeepType"] = "Unknown";
                returnInfo["InitialValue"] = "WARNING";
                return returnInfo;
            }
        }
    }

    navigateNext() {
        // Fire the Flow Navigation Next Event
        this.dispatchEvent(new FlowNavigationNextEvent());
    }
}