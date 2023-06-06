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
 */ (record, render, runtime, search, email, file) => {
  let emailParameters = Object.freeze({
    subsidiaries: [
      {
        name: "Healthcare2U, LLC",
        id: 2,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "HC2U Physician Services-New York",
        id: 16,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "HC2UAR Network, PLLC",
        id: 14,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "HC2UAZ Network, PLLC",
        id: 13,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "HC2UCA Network, Professional Corporation",
        id: 15,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "HC2UIA Network, PLLC",
        id: 17,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "HC2ULA Network, Professional Corporation",
        id: 18,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "HC2UNV Network (Rodriguez), PLLC",
        id: 11,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "Healthcare2U Physician Services",
        id: 7,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "HC2UTX Network, LLC",
        id: 25,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "Healthcare2UNJ Network, PC",
        id: 10,
        sender: 2021,
        emailTemplate: 7,
      },
      {
        name: "PrimeCare Group Strategies, LLC",
        id: 27,
        sender: 2021,
        emailTemplate: 7,
      },
    ],
  });

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
    let sender = null;
    let emailTemplate = null;
    const subsidiary = bpRec.getValue("subsidiary");
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
      log.debug("email parameters", { sender, emailTemplate });
      let transanctionType = "VendorBill";
      for (let i = 0; i < bpRec.getLineCount("apply"); i++) {
        bpRec.selectLine({
          sublistId: "apply",
          line: i,
        });
        let tranType = bpRec.getCurrentSublistValue({
          sublistId: "apply",
          fieldId: "trantype",
        });
        let internalId = bpRec.getCurrentSublistValue({
          sublistId: "apply",
          fieldId: "internalid",
        });

        if (tranType.toString() == "Journal") {
          transanctionType = "vendorpayment";
          break;
        } else {
          transanctionType = "vendorbill";
          billIds.push(internalId);
        }
      }
      log.debug("transanctionType", transanctionType);
      if (transanctionType != "vendorbill") {
        let billFileIds = [];
        billIds.forEach((recId) => {
          billFileIds.push(getAttachedFile({ recId, transanctionType }));
        });
        billFileIds = billFileIds.flat(1);
        log.debug("billFileIds", billFileIds);
        let attachments = new Array();
        billFileIds.forEach((internalid) =>
          attachments.push(file.load(internalid))
        );
        email.send({
          author: sender,
          body: mailTemplate.body,
          recipients: 1896,
          subject: mailTemplate.subject,
          attachments: attachments,
        });
      } else {
        let attachments = new Array();
        let attachmentsId = getAttachedFile({ recId, transanctionType });
        attachmentsId.forEach((internalid) =>
          attachments.push(file.load(internalid))
        );

        log.debug("attachments", attachments);
        email.send({
          author: sender,
          body: mailTemplate.body,
          recipients: 1896,
          subject: mailTemplate.subject,
          attachments: attachments,
        });
      }
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
      return arrAttachmentObjects;
    } catch (e) {
      log.error("getAttachedFile", e.message);
    }
  };
  // const getRelatedFiles = (transactionId) => {
  //   let arrAttachmentObjects = [];
  //   let purchaseReqSearchObj = search.create({
  //     type: "purchaserequisition",
  //     filters: [
  //       ["type", "anyof", "PurchReq"],
  //       "AND",
  //       ["internalid", "anyof", transactionId],
  //       "AND",
  //       ["mainline", "is", "T"],
  //     ],
  //     columns: [
  //       search.createColumn({
  //         name: "internalid",
  //         join: "file",
  //         sort: search.Sort.ASC,
  //         label: "Internal ID",
  //       }),
  //       search.createColumn({
  //         name: "name",
  //         join: "file",
  //         label: "Name",
  //       }),
  //       search.createColumn({
  //         name: "documentsize",
  //         join: "file",
  //         label: "Size (KB)",
  //       }),
  //     ],
  //   });
  //   let searchResultCount = purchaseReqSearchObj.runPaged().count;
  //   log.debug("PurchaseRequisition result count", searchResultCount);
  //   purchaseReqSearchObj.run().each(function (result) {
  //     let intAttachmentId = result.getValue({
  //       name: "internalid",
  //       join: "file",
  //     });
  //     let flDocumentSize = result.getValue({
  //       name: "documentsize",
  //       join: "file",
  //     });
  //
  //     log.debug({
  //       title: "intAttachmentId + flDocumentSize",
  //       details: intAttachmentId + " + " + flDocumentSize,
  //     });
  //
  //     if (intAttachmentId) {
  //       let objAttachmentDetails = {};
  //       objAttachmentDetails.intAttachmentId = intAttachmentId;
  //       objAttachmentDetails.flDocumentSize = flDocumentSize;
  //
  //       arrAttachmentObjects.push(objAttachmentDetails);
  //     }
  //
  //     return true;
  //   });
  //
  //   let purchaserequisitionSearchObj = search.create({
  //     type: "purchaserequisition",
  //     filters: [
  //       ["type", "anyof", "PurchReq"],
  //       "AND",
  //       ["mainline", "is", "F"],
  //       "AND",
  //       ["internalid", "anyof", transactionId],
  //       "AND",
  //       [
  //         "formulanumeric: CASE WHEN {custcol_line_attachment} IS NOT NULL THEN 1 ELSE 0 END",
  //         "equalto",
  //         "1",
  //       ],
  //     ],
  //     columns: [
  //       search.createColumn({
  //         name: "custcol_line_attachment",
  //         label: "Line Attachment",
  //       }),
  //       search.createColumn({
  //         name: "formulatext",
  //         formula: "{custcol_line_attachment.id}",
  //         label: "Formula (Text)",
  //       }),
  //     ],
  //   });
  //   let count = purchaserequisitionSearchObj.runPaged().count;
  //   log.debug("purchaserequisitionSearchObj result count", count);
  //   purchaserequisitionSearchObj.run().each(function (result) {
  //     let intAttachmentLineId = result.getValue({
  //       name: "formulatext",
  //     });
  //     let flDocumentLineSize = 0;
  //
  //     log.debug({
  //       title: "intAttachmentLineId + flDocumentLineSize",
  //       details: intAttachmentLineId + " + " + flDocumentLineSize,
  //     });
  //
  //     if (intAttachmentLineId) {
  //       let objAttachmentDetails = {};
  //       objAttachmentDetails.intAttachmentId = intAttachmentLineId;
  //       objAttachmentDetails.flDocumentSize = flDocumentLineSize;
  //
  //       arrAttachmentObjects.push(objAttachmentDetails);
  //     }
  //
  //     return true;
  //   });
  //
  //   return arrAttachmentObjects;
  // };

  return { onAction };
});
