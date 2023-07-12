/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define([
  "N/record",
  "N/render",
  "N/runtime",
  "N/search",
  "N/email",
  "N/file",
], /**
 * @param{record} record
 * @param{render} render
 * @param{runtime} runtime
 * @param{search} search
 * @param email
 * @param file
 */ (record, render, runtime, search, email, file) => {
  function getEmailParams() {
    let params = getParameters();
    return Object.freeze({
      subsidiaries: [
        {
          name: "Healthcare2U, LLC",
          id: 2,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "HC2U Physician Services-New York",
          id: 16,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "HC2UAR Network, PLLC",
          id: 14,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "HC2UAZ Network, PLLC",
          id: 13,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "HC2UCA Network, Professional Corporation",
          id: 15,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "HC2UIA Network, PLLC",
          id: 17,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "HC2ULA Network, Professional Corporation",
          id: 18,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "HC2UNV Network (Rodriguez), PLLC",
          id: 11,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "Healthcare2U Physician Services",
          id: 7,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "HC2UTX Network, LLC",
          id: 25,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "Healthcare2UNJ Network, PC",
          id: 10,
          sender: params.hc2uSender,
          emailTemplate: params.hc2uTemplate,
        },
        {
          name: "PrimeCare Group Strategies, LLC",
          id: 27,
          sender: params.primeSender,
          emailTemplate: params.primeCareTemplate,
        },
      ],
    });
  }

  /**
   * Defines the WorkflowAction script trigger point.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
   * @param {string} scriptContext.type - Event type
   * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
   * @since 2016.1
   */
  const onAction = (scriptContext) => {
    const bpRec = scriptContext.newRecord;
    let recId = scriptContext.newRecord.id;
    let entity = bpRec.getValue("entity");
    let transactionToUpdate = [];
    let sender = null;
    let emailTemplate = null;
    const subsidiary = bpRec.getValue("subsidiary");
    let emailParameters = getEmailParams();

    try {
      for (let i = 0; i < emailParameters.subsidiaries.length; i++) {
        if (subsidiary == emailParameters.subsidiaries[i].id) {
          emailTemplate = emailParameters.subsidiaries[i].emailTemplate;
          sender = emailParameters.subsidiaries[i].sender;
          break;
        }
      }
      let billIds = [];
      let mailTemplate = render.mergeEmail({
        templateId: emailTemplate,
        entity: null,
        recipient: null,
        supportCaseId: null,
        transactionId: recId,
        customRecord: null,
      });

      for (let i = 0; i < bpRec.getLineCount("apply"); i++) {
        bpRec.selectLine({
          sublistId: "apply",
          line: i,
        });
        let apply = bpRec.getCurrentSublistValue({
          sublistId: "apply",
          fieldId: "apply",
        });

        let tranType = bpRec.getCurrentSublistValue({
          sublistId: "apply",
          fieldId: "trantype",
        });
        let internalId = bpRec.getCurrentSublistValue({
          sublistId: "apply",
          fieldId: "internalid",
        });

        if(apply == false) continue
        log.debug("apply", {apply,internalId,tranType})
        if (tranType == "VendBill") {
          if (
            checkIfExcluded({
              transactionType: "vendorbill",
              recId: internalId,
            }) == true
          ) {
            log.emergency("Already updated", internalId)

          } else {
            transactionToUpdate.push({
              internalId: internalId,
              transactionType: "vendorbill",
            });
          }
        } else {
          if (
            checkIfExcluded({
              transactionType: "journalentry",
              recId: internalId,
            }) == true
          ) {
            continue;

          } else {
            billIds.push(internalId);
            transactionToUpdate.push({
              internalId: internalId,
              transactionType: "journalentry",
            });
          }
        }
      }
      let transanctionType = "";
      let allFileIds = [];
      let billFileIds = [];
      if (billIds.length > 0) {
        transanctionType = "journalentry";
        billIds.forEach((recId) => {
          billFileIds.push(getAttachedFile({ recId, transanctionType }));
        });
      }
      transanctionType = "vendorpayment";
      let billPaymentFileIds = getAttachedFile({ recId, transanctionType });
      log.debug("file", { billFileIds, billPaymentFileIds });
      allFileIds = [billFileIds, billPaymentFileIds];

      allFileIds = allFileIds.flat(2);
      log.debug("allFileIds", allFileIds);
      let attachments = new Array();
      allFileIds.forEach((internalid) =>
        attachments.push(file.load(internalid))
      );
      if(transactionToUpdate.length > 0){
        email.send({
          author: sender,
          body: mailTemplate.body,
          recipients: entity,
          subject: mailTemplate.subject,
          attachments: attachments,
          relatedRecords: {
            entityId: entity,
            transactionId: recId,
          },
        });
      }

      log.emergency("transactionToUpdate", transactionToUpdate);
      updateExcludeRemitEmail(transactionToUpdate);
    } catch (e) {
      log.error("onAction", e.message);
    }
  };

  function getEmailTemplate(name) {
    let templateId = null;
    const emailtemplateSearchObj = search.create({
      type: "emailtemplate",
      filters: [["name", "is", name]],
    });
    emailtemplateSearchObj.run().each(function (result) {
      templateId = result.id;
    });
    return templateId;
  }

  /**
   * Get the file attached to the record
   * @param {int} options.recId internal id of the record
   * @param {string} options.transanctionType type of the record
   * @return {*[]}
   */
  const getAttachedFile = (options) => {
    try {
      let arrAttachmentObjects = [];

      let purchaseReqSearchObj = search.create({
        type: options.transanctionType,
        filters: [
          ["internalid", "anyof", options.recId],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [
          search.createColumn({
            name: "internalid",
            join: "file",
            sort: search.Sort.ASC,
            label: "Internal ID",
          }),
          search.createColumn({
            name: "name",
            join: "file",
            label: "Name",
          }),
          search.createColumn({
            name: "documentsize",
            join: "file",
            label: "Size (KB)",
          }),
        ],
      });

      purchaseReqSearchObj.run().each(function (result) {
        let intAttachmentId = result.getValue({
          name: "internalid",
          join: "file",
        });

        if (intAttachmentId) {
          arrAttachmentObjects.push(+intAttachmentId);
        }

        return true;
      });
      log.debug("arrAttachmentObjects", arrAttachmentObjects);

      return arrAttachmentObjects;
    } catch (e) {
      log.error("getAttachedFile", e.message);
    }
  };

  /**
   * Update all of the bill/journal that is already email has been sent
   * @param arrayObject - List of vendorbill/journal to be updated
   *
   */
  function updateExcludeRemitEmail(arrayObject) {
    let Id;
    try {
      arrayObject.forEach((arr) => {
        try {
          Id = record.submitFields({
            type: arr.transactionType,
            id: arr.internalId,
            values: {
              custbody_serp_exclude_remit_email: true,
            },
          });
        } catch (e) {
          log.error(arr.internalId, e.message);
          if (arr.transactionType == "journal") {
            Id = record.submitFields({
              type: "advintercompanyjournalentry",
              id: arr.internalId,
              values: {
                custbody_serp_exclude_remit_email: true,
              },
            });
          }
        }
      });
      log.debug("Successfully Updated", Id);
    } catch (e) {
      log.error("updateExcludeRemitEmail", e.message);
    }
  }

  /**
   * Check if the vendorpayment is excluded for sending email
   * @param options.transactionType,
   * @param options.recId
   */
  function checkIfExcluded(options) {
    try {
      const fieldLookup = search.lookupFields({
        type: options.transactionType,
        id: options.recId,
        columns: ["custbody_serp_exclude_remit_email"],
      });
      return fieldLookup.custbody_serp_exclude_remit_email;
    } catch (e) {
      log.error("checkIfExcluded", e.message);
    }
  }

  function getParameters() {
    try {
      const scriptObj = runtime.getCurrentScript();
      return {
        hc2uSender: scriptObj.getParameter(
          "custscript_serp_default_hc2u_sender"
        ),
        primeSender: scriptObj.getParameter(
          "custscript_serp_default_prime_sender"
        ),
        hc2uTemplate: scriptObj.getParameter(
          "custscript_serp_default_hc2u_template"
        ),
        primeCareTemplate: scriptObj.getParameter(
          "custscript_serp_default_prime_template"
        ),
      };
    } catch (e) {
      log.error("getParameters", e.message);
    }
  }

  return { onAction };
});
