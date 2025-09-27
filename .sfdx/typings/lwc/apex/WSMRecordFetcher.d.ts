declare module "@salesforce/apex/WSMRecordFetcher.fetchRecords" {
  export default function fetchRecords(param: {objectApiName: any, soqlConditions: any}): Promise<any>;
}
declare module "@salesforce/apex/WSMRecordFetcher.WSMRecordFetcherSOQLOnly" {
  export default function WSMRecordFetcherSOQLOnly(param: {SOQLQuery: any}): Promise<any>;
}
