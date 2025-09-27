import { LightningElement, api } from 'lwc';
import { FlowNavigationNextEvent, FlowNavigationBackEvent, FlowNavigationFinishEvent } from 'lightning/flowSupport';
import saveSignatureToRecord from '@salesforce/apex/WSMSignatureController.saveSignatureToRecord';

export default class Wsm_docgen_esign_parent extends LightningElement {
    @api IncWSMDocGenRecordId;

    imgSrc;
    
    renderedCallback() {
        document.fonts.forEach((font) => {
            if (font.family === "Great Vibes" && font.status === "unloaded") {
                // Ensure that the font is loaded so that signature pad could use it.
                // If you are using a different font in your project, don't forget
                // to update the if-condition above to account for it.
                font.load();
            }
        });
    }
    
    saveSignature() {
        const pad = this.template.querySelector("c-wsm_docgen_esign_signature");
        if (pad) {
            const dataURL = pad.getSignature();
            if (dataURL) {
                this.imgSrc = dataURL;

                // Convert dataURL to Blob
                let blob = this.dataURLToBlob(dataURL);

                // Create a FileReader to read the blob as Base64
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    let base64data = reader.result;
                    this.uploadToSalesforce(base64data.split(',')[1]); // Remove the prefix (e.g., "data:image/png;base64,")
                };
            }
        }
    }

    dataURLToBlob(dataURL) {
        let binary = atob(dataURL.split(',')[1]);
        let array = [];
        for (let i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], {type: 'image/png'});
    }

    uploadToSalesforce(base64) {
        saveSignatureToRecord({ recordId: this.IncWSMDocGenRecordId, base64Data: base64 })
            .then(result => {
                console.log('Signature saved:', result);
                this.navigateNext();  // Navigate to the next screen in the flow
            })
            .catch(error => {
                console.error('Error saving signature:', error);
                // Handle errors, possibly navigate back or show a message
            });
    }

    clearSignature() {
        const pad = this.template.querySelector("c-wsm_docgen_esign_signature");
        if (pad) {
            pad.clearSignature();
        }
        this.imgSrc = null;
    }

    navigateNext() {
        // Fire the Flow Navigation Next Event
        this.dispatchEvent(new FlowNavigationNextEvent());
    }

}