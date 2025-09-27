// Import LWC Needs for this library
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

function MakeSomeToast(title, message, variant) {
    const event = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant,
    });
    this.dispatchEvent(event);
}


export { MakeSomeToast };

// write the below in your imports to import this full library
// import { handleGoNext } from './wsm_common_helper_library.js';

/*
Other Important Functions which can not be in a helper class, but are useful to copy paste.



*/