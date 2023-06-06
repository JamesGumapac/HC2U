/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
 define(["N/record"], function(record) {
    function onAction(scriptContext){

        try{
            var newRecord = scriptContext.newRecord;
            var vendorId = newRecord.getValue('custrecord_2663_parent_vendor');

            var vendorRecord = record.submitFields({
                type: 'vendor',
                id: vendorId,
                values: {
                    custentity_2663_payment_method: true
                }
            });
            log.audit("Record Updated ", vendorRecord);

        }catch(e){
            log.error({
                title: 'Error',
                details: e
            });
        }

    }
    return {
        onAction: onAction
    }
});