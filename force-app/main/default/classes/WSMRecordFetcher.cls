public with sharing class WSMRecordFetcher {
    @AuraEnabled(cacheable=true)
    public static List<sObject> fetchRecords(String objectApiName, String soqlConditions) {
        String queryString = 'SELECT ' + String.join(new List<String>(Schema.getGlobalDescribe().get(objectApiName).getDescribe().fields.getMap().keySet()), ', ') + ' FROM ' + objectApiName + ' WHERE ' + soqlConditions;
        return Database.query(queryString);
    }
    @AuraEnabled(cacheable=true)
    public static List<sObject> WSMRecordFetcherSOQLOnly(String SOQLQuery) {
        return Database.query(SOQLQuery);
    }
}