import { LightningElement, api, track } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';
import fetchRecords from '@salesforce/apex/WSMRecordFetcher.fetchRecords';
import WSMRecordFetcherSOQLOnly from '@salesforce/apex/WSMRecordFetcher.WSMRecordFetcherSOQLOnly';
import { CreateHeader, CreateFooter, SectionClass } from './HTMLCodeLibrary';

export default class Wsm_docgen_maintool extends LightningElement {
    ProgressBarPercent;
    ProgressBarMessage;
    ShowNext;

    RecordGrabbedByApexToDocGen;
    CompiledDocumentHtmlMergeFieldsReplaced;
    CompiledDocumentHtmlAllSections = "";
    CompiledDocumentCSSAll = "";

    AllMergeFields;
    ObjectApiNameCamelCase;

    @api IncDocumentTemplate;
    @api IncDocumentTemplateSections;
    @api IncRecordId;
    @api IncObjectApiName;
    @api IncWSMDocGenRecordId;


    connectedCallback() {
        this.ShowNext = false;
        this.ObjectApiNameCamelCase = this.IncObjectApiName.charAt(0).toUpperCase() + this.IncObjectApiName.slice(1)
        this.CompileDocumentCSS('wsm_page_outer', 'background-color:' + this.IncDocumentTemplate.Page_Body_Background_Color__c + ';');
        this.CompileDocumentCSS('wsm_section', 'padding:' + this.IncDocumentTemplate.Body_Section_Padding__c + ';');
        this.CompileDocumentCSS('wsm_head_logobox', 'background-image: URL(\'' + this.IncDocumentTemplate.Header_Logo_URL__c + '\');height:0px;width:400px;background-size:contain;');

        let baseSectionHeight_nohead_nofoot = 1002;
        this.CompileDocumentCSS('wsm_baseSectionHeight_nohead_nofoot', 'height: ' + baseSectionHeight_nohead_nofoot + 'px;');
        this.CompileDocumentCSS('wsm_baseSectionHeight_yeshead_nofoot', 'height: ' + (baseSectionHeight_nohead_nofoot - this.IncDocumentTemplate.Header_Height_px__c) + 'px;');
        this.CompileDocumentCSS('wsm_baseSectionHeight_nohead_yesfoot', 'height: ' + (baseSectionHeight_nohead_nofoot - this.IncDocumentTemplate.Footer_Height_px__c) + 'px;');
        this.CompileDocumentCSS('wsm_baseSectionHeight_yeshead_yesfoot', 'height: ' + (baseSectionHeight_nohead_nofoot - (this.IncDocumentTemplate.Header_Height_px__c + this.IncDocumentTemplate.Footer_Height_px__c)) + 'px;');

        this.updateProgressBar(0, "Starting");
        this.HelperConnectedCallback();
    }

    async HelperConnectedCallback() {
        let DonePercentJump = 50 / this.IncDocumentTemplateSections.length;
        this.CompiledDocumentHtmlAllSections = await this.CompileDocumentPage(DonePercentJump);
        this.updateProgressBar(50, "Getting Salesforce Record Data");
        this.RecordGrabbedByApexToDocGen = await this.getAllDocumentMergeFields();
        this.updateProgressBar(55, "Replacing Merge Fields");
        this.CompiledDocumentHtmlMergeFieldsReplaced = await this.replaceMergeFields(this.CompiledDocumentHtmlAllSections, this.RecordGrabbedByApexToDocGen);
        this.updateProgressBar(75, "Creating Holding Pen for Document");

        let RecordToUpdate = {
            fields: {
                Id: this.IncWSMDocGenRecordId,
                Body1__c: this.CompiledDocumentHtmlMergeFieldsReplaced,
                CSS_Input__c: this.CompiledDocumentCSSAll,
            }
        }
        this.updateProgressBar(85, "Creating Record in Salesforce");
        this.ShowNext = await this.getupdatedrec(RecordToUpdate);
        this.ShowNext = true;
        this.updateProgressBar(100, "Completed");
    }

    async GetParentRecordData() {
        try {
            let soqlparent = "Id = '" + this.IncRecordId + "'";
            this.RecordGrabbedByApexToDocGen = await this.loadRecords(this.IncObjectApiName, soqlparent);
            //console.log('RecordGrabbedByApexToDocGen: ' + JSON.stringify(this.RecordGrabbedByApexToDocGen));
        }
        catch (error) {
            console.log(error);
        }

    }

    async loadRecords(objectApiName, soql) {
        try {
            const data = await fetchRecords({ objectApiName: objectApiName, soqlConditions: soql });
            let records = data;
            let error = undefined;
            return records;
        } catch (error) {
            console.error('Error fetching records:', error);
            return error;
        }
    }

    async LoadFromSOQLQuery(query) {
        try {
            const data = await WSMRecordFetcherSOQLOnly({ SOQLQuery: query });
            let records = data;
            let error = undefined;
            console.log("Record in the Query Function ", JSON.stringify(records));
            return records;
        } catch (error) {
            console.error('Error fetching records:', error);
            return error;
        }
    }

    getupdatedrec(record, incToastTitle, incToastMsg) {

        updateRecord(record)
            .then(() => {
                console.log('The record has been updated');
                return true;
            })
            .catch(error => {
                console.error(JSON.stringify(error));
                const errorEvent = new ShowToastEvent({
                    title: 'Error!',
                    message: 'An error occurred while updating the Docgen Record Body: ' + error.message,
                    variant: 'error'
                });
                this.dispatchEvent(errorEvent);
            });
    }
    CompileDocumentCSS(ClassName, ClassContent) {
        this.CompiledDocumentCSSAll += '.' + ClassName + ' {\n' + ClassContent + ' }\n\n';
    }

    CompileDocumentPage(PercentCompleteJumpPerSection) {
        let PercentComplete = this.ProgressBarPercent;
        let ReturnedHTMLCompiled = '';
        let loopFields = ['Name', 'WSM_Section_Subtitle__c', 'Body__c'];
        let loopPreHtml = ['<h2 class="wsm_section_title">', '<h3 class="wsm_section_subtitle">', '<div class="wsm_section_body">']
        let loopPostHtml = ['</h2>', '</h3>', '</div>'];

        this.IncDocumentTemplateSections.forEach(element => {
            PercentComplete += PercentCompleteJumpPerSection;
            this.updateProgressBar(PercentComplete, "Compiling Section " + element.Name);

            // Check if the section uses the header from the document template.
            let loopSectionHeaderHtml = '';
            let headerUsed = false;
            if (element.Use_Template_Header_On_This_Section__c) {
                loopSectionHeaderHtml = CreateHeader(this.IncDocumentTemplate.Page_Header__c, this.IncDocumentTemplate.Header_Background_Color__c, this.IncDocumentTemplate.Header_Height_px__c, this.IncDocumentTemplate.Header_Logo_URL__c, this.IncDocumentTemplate.Header_Padding_Vertical_px__c, this.IncDocumentTemplate.Header_Padding_Sides_px__c);
                headerUsed = true;
            };

            // Check if the section uses the footer  from the document template.
            let loopSectionFooterHtml = '';
            let footerUsed = false;
            if (element.Use_Template_Footer_On_This_Section__c) {
                loopSectionFooterHtml = CreateFooter(this.IncDocumentTemplate.Page_Footer__c, this.IncDocumentTemplate.Footer_Background_Color__c, this.IncDocumentTemplate.Footer_Height_px__c);
                footerUsed = true;
            };

            //evaluate the CSS section class needed
            let UsedSectionSizeClass = SectionClass(headerUsed, footerUsed);

            let loopSectionHtml = '<apex:pageBlock><div class="wsm_page_outer">'; // Clean the loop variable
            // Fill Header HTML
            loopSectionHtml += loopSectionHeaderHtml;

            loopSectionHtml += '<div class="wsm_section ' + UsedSectionSizeClass + '">';
            // Check if this is the last template section.
            for (var i = 0; i < loopFields.length; i++) {
                if (element[loopFields[i]] != undefined) {
                    loopSectionHtml += loopPreHtml[i] + element[loopFields[i]] + loopPostHtml[i];
                }
            }
            loopSectionHtml += '</div>'; // close out the section html

            // Fill Footer HTML
            loopSectionHtml += loopSectionFooterHtml;

            //close the page block
            loopSectionHtml += '</div></apex:pageBlock>';
            // check to see if the page should break before next page.
            if (element.Break_Page_After_Section__c) {
                loopSectionHtml += '<div class="wsm_page_break" style="page-break-after:always;"></div>';
            };
            ReturnedHTMLCompiled += loopSectionHtml;
        });
        return ReturnedHTMLCompiled;
    }

    getAllDocumentMergeFields() {
        this.AllMergeFields = this.extractMergeFields(this.CompiledDocumentHtmlAllSections);
        let MergeQueryFields = "";
        let CommaHolder = "";
        //console.log("All Merge Fields Found ", JSON.stringify(this.AllMergeFields));
        for (var i = 0; i < this.AllMergeFields.length; i++) {

            // determine the need for a comma
            if (i == 0) {
                CommaHolder = "";
            }
            else {
                CommaHolder = ", ";
            }
            //console.log("Loop " + i + " Comma = " + CommaHolder);

            // 
            if (this.AllMergeFields[i] == undefined) {
                console.log("Undefined Filtered")
            }
            else if (MergeQueryFields.includes(this.AllMergeFields[i])) {
                console.log("Duplicate Merge Field: " + this.AllMergeFields[i]);
            }
            else {
                MergeQueryFields += CommaHolder + this.AllMergeFields[i];
            }
        }
        let CompiledQuery = 'SELECT ' + MergeQueryFields + ' FROM ' + this.ObjectApiNameCamelCase + ' WHERE Id = \'' + this.IncRecordId + '\'';
        console.log(CompiledQuery);
        let returnedCuratedRecord = this.LoadFromSOQLQuery(CompiledQuery);
        console.log(JSON.stringify(returnedCuratedRecord));
        return returnedCuratedRecord;
    }

    extractMergeFields(richText) {
        console.log(richText);
        const mergeFields = [];
        const regexPattern = `{{${this.ObjectApiNameCamelCase}.(.*?)}}`;
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

    replaceMergeFields(UnreplacedHTML, ReplacementData) {
        console.log("Data from SOQL Query ", JSON.stringify(ReplacementData));

        // Assuming the object has the correct structure and there's at least one object in the array
        const data = ReplacementData[0];  // Access the first object in the array if that's your use case
        const objectApiNameCamelCase = "Lead";  // Assuming 'Lead' is the correct API name prefix as seen in the HTML

        // Update the regex to correctly match fields with the 'Lead' prefix
        const regexPattern = `{{${objectApiNameCamelCase}\.(.*?)}}`;
        const regex = new RegExp(regexPattern, "g");

        const replacedText = UnreplacedHTML.replace(regex, (match, p1) => {
            return data[p1] || match;  // Replace with data from the object or leave unchanged if not found
        });
        return replacedText;
    }

    // COMMON COMMON COMMON COMMON COMMON COMMON COMMON COMMON COMMON COMMON COMMON COMMON COMMON COMMON 
    updateProgressBar(PercentComplete, Message) {
        this.ProgressBarPercent = PercentComplete;
        this.ProgressBarMessage = Message;
    }
    handleGoNextController() {
        this.handleGoNext();
    }
    @api
    handleGoNext() {
        const nextNavigationEvent = new FlowNavigationNextEvent();
        this.dispatchEvent(nextNavigationEvent);
    }
}