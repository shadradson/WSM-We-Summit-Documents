import { LightningElement, api, track } from 'lwc';
import getFieldDetails from '@salesforce/apex/WSMObjectFieldDetails.getFieldDetails'; // Get merge field builder tool

export default class Wsm_docgen_mergefield_tool extends LightningElement {
    @api IncDocumentTemplate;
    @api textToCopy;
    @track AllMergeFields = [];
    UnfilteredMergeFields = [];

    connectedCallback() {
        console.log(JSON.stringify(this.IncDocumentTemplate));
        getFieldDetails({objectApiName: this.IncDocumentTemplate.Object_API_Name__c}).then(result => {
            let result2 = JSON.parse(JSON.stringify(result));
            console.log(JSON.stringify(result2));
            result2.forEach(element => {
                element['mergetxt'] = '{{'  + this.IncDocumentTemplate.Object_API_Name__c + '.' + element.apiName + '}}';
                this.UnfilteredMergeFields = [...this.UnfilteredMergeFields, element]
                this.AllMergeFields = [...this.AllMergeFields, element];
            });
        }).catch(error => {
            console.log(error);
        });
        this.textToCopy = "texting"
    }

    copyMerge(event) {
        let copytxt = event.target.dataset.mergetxt;
        
         // Copy the text inside the text field
        this.copyTextToClipboard(copytxt);
        
    }
    
    searchMergest(event) {
        this.AllMergeFields = this.UnfilteredMergeFields.filter(obj => obj.label.toLowerCase().includes(event.target.value.toLowerCase()) || obj.mergetxt.toLowerCase().includes(event.target.value.toLowerCase()) );
    }

    copyTextToClipboard(inctxt) {
        // Query the hidden input element within the component's template
        const hiddenInput = this.template.querySelector('[data-hidden-input]');
        this.textToCopy = inctxt;
        // Set the value to the text you want to copy (optional if already set)
        hiddenInput.value = this.textToCopy;

        // Select the text in the hidden input
        hiddenInput.select();
        hiddenInput.setSelectionRange(0, 99999); // For mobile devices

        // Execute the copy command
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                // Provide user feedback (optional)
                console.log('Text copied to clipboard');
            } else {
                console.error('Copy command was unsuccessful');
            }
        } catch (err) {
            console.error('Error copying text: ', err);
        }

        // Deselect the text (optional)
        hiddenInput.blur();
    }

}