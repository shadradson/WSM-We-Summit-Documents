import { LightningElement, api, track } from 'lwc';
import { FlowNavigationNextEvent, FlowNavigationBackEvent, FlowNavigationFinishEvent } from 'lightning/flowSupport';

export default class Wsm_docgen_JSON_editor extends LightningElement {
    @api IncJSON;
    @api OutJSON;
    @api OutNavigateFunction;
    @track WorkingObject = [];
    @track WorkingObject2 = [];



    chkoptions = [{ label: 'Always TRUE', value: 'at' }, { label: 'Always FALSE', value: 'af' }, { label: 'SF Merge Field', value: 'sfm' }];

    connectedCallback() {
        const FieldDef = class {
            settings = {isunknownfield: true};
            handleBuild() {
                if (this.DeepFieldType == "Text") { this.settings.istextfield = true; }
                else if (this.DeepFieldType == "Checkbox") { this.settings.ischkfield = true; }
                else if (this.DeepFieldType == "Dropdown" || this.DeepFieldType == "Radio Group" || this.DeepFieldType == "Options List") { this.settings.ispickfield = true;  }
                else { this.settings.isunknownfield = true;}

                /*/fix options list into object
                if (this.Options != undefined) {
                    this.Options = JSON.parse(JSON.stringify(this.Options));
                    console.log(JSON.stringify(this.Options));
                }*/
            }
            handleDummeData(IncDummyTXT) {
                if (this.DeepFieldType == "Text") {
                    this.IncData = IncDummyTXT;
                    console.log("Assigned dummy text ", this.IncData)
                }
            }

        }

        let Passoff = JSON.parse(this.IncJSON);
        Passoff.forEach(field => {
            let NewFieldDefPre = new FieldDef();
            let NewFieldDef = Object.assign(NewFieldDefPre, field);
            NewFieldDef.handleBuild();
            //this.WorkingObject.push(field);
            this.WorkingObject2.push(NewFieldDef);
        });
    }
    renderedCallback() {
        let RowsToBGColor = this.template.querySelectorAll("[data-bgcolor]");
        let currentColorClass;
        RowsToBGColor.forEach(row => {
            currentColorClass = row.dataset.bgcolor.replace(/\s+/g, "")
            row.classList.add(currentColorClass);
        });
    }

    fillDummyData() {
        for (let index = 0; index < this.WorkingObject2.length; index++) {
            this.WorkingObject2[index].handleDummeData(index.toString(36));
        }
        this.WorkingObject2 = [...this.WorkingObject2];
    }

    updateJSON(evt) {
        var key = evt.target.dataset.field;
        console.log(key);
        //<lightning-input data-field={field.Name} data-type="note" onchange={updateJSON} name="Notes" type="string" label="Notes about Field"  value={field.UserNote}></lightning-input>
        //<lightning-input data-field={field.Name} data-type="data" onchange={updateJSON} name="Data" type="string" label="Field Value (or Merge)"  value={field.IncData}></lightning-input>

        for (const [i, value] of this.WorkingObject2.entries()) {
            //console.log(JSON.stringify(value));
            if (value.Name == key) {
                if (evt.target.dataset.type == "data") {
                    this.WorkingObject2[i].IncData = evt.target.value;
                }
                if (evt.target.dataset.type == "note") {
                    this.WorkingObject2[i].UserNote = evt.target.value;
                }
                if (evt.target.dataset.type == "usersettings") {
                    this.WorkingObject2[i].UserSettings = evt.target.value;

                }
                if (evt.target.dataset.type == "skip") {
                    this.WorkingObject2[i].skip = evt.target.checked;
                }
                if (evt.target.dataset.type == "name") {
                    this.WorkingObject2[i].Name = evt.target.value;
                }
                if (evt.target.dataset.type == "signature") {
                    this.WorkingObject2[i].signature = evt.target.checked;
                }
                console.log(JSON.stringify(value));
            }
            //console.log('%d: %s', i, value);
        }
        this.OutJSON = JSON.stringify(this.WorkingObject2);

    }

    navigateNext(evt) {
        let passoff = [];
        this.WorkingObject2.forEach (row => {
            delete row.settings
            passoff.push(row);
        });
        this.OutJSON = JSON.stringify(passoff);
        this.OutNavigateFunction = evt.target.dataset.function;
        //console.log("navigate");
        const navigateNextEvent = new FlowNavigationNextEvent();
        this.dispatchEvent(navigateNextEvent);
        // Fire the Flow Navigation Next Event
        if (this.availableActions.find((action) => action === "NEXT")) {
            const navigateNextEvent = new FlowNavigationNextEvent();
            this.dispatchEvent(navigateNextEvent);
        }
        else {
            const navigateNextEvent = new FlowNavigationFinishEvent();
            this.dispatchEvent(navigateNextEvent);
        }
    }

}